---
layout: post
author: Vulkey_Chen
title: "打造Mac下APK逆向环境到实战接口XSS挖掘"
date: 2018-11-18
music-id: 1295969255
permalink: /archives/2018-11-18/1
description: "打造Mac下APK逆向环境到实战接口XSS挖掘"
---

# 前言

想尝试逆向APK来发现一些接口和安全问题，但是Mac下没啥好用的APK逆向工具，于是我就参考文章：https://blog.csdn.net/jyygn163/article/details/71731786 的思路在Mac下使用homebrew安装：

```shell
brew install apktool
brew install dex2jar
```

JD-GUI去http://jd.benow.ca/下载，这里我是用的是jar版。

# 过程

## 自动化编译

手动敲命令太繁琐了，写个shell脚本一键化。

在`.bash_profile`文件（环境变量）加入这个命令`alias apkdec="/Users/chen/HackBox/Tools/Android\ Decompile/DeApkScript.sh"`，这样当终端打开的时候就可以使用`apkdec`命令了，而脚本`DeApkScript.sh`的内容如下：

```shell
apktool d $1 && mv $1 $1.zip && unzip $1.zip "*.dex" -d $1_dex/ && cd $1_dex/ && d2j-dex2jar *.dex 
```

功能实现如下：

- apktool获取资源文件
- 将apk文件重命名为zip文件
- 解压zip文件中的.dex文件
- 切换解压目录
- 将dex文件转换成jar文件

这样，最后只需要使用JD-GUI反编译JAR即可看见源码了。

## 实战

运行命令：

```shell
apkdec xxx.apk
```

![apkdec](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/0.png)

首先对`classes-dex2jar.jar`文件进反编译，但似乎在Mac下JD-GUI支持的不太好，所以我选择使用luyten（Download：https://github.com/deathmarine/Luyten/releases），如下是两张对比图：

![apkdec](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/1.png)

## 漏洞挖掘

在luyten下使用Command+G快捷键全局搜索，搜索域名寻找接口（因为这个APP需要内部人员才能登录所以从正常的入口是无法找到接口进行漏洞挖掘的）

![search](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/2.png)

寻找了一番看见这样一个接口：

![api](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/3.png)

二话不说访问之，提示：

```json
{"res_code":"-1008003","res_message":"参数错误","timeMillis":1542516229723}
```

不懂Java的我一脸懵，但是天下语言都是互通的，大概的了解了代码的意思（可能理解的不到位，就不说出来误导了），于是找到这样一个函数：

![function](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/4.png)

从我的理解来看这个接口就是有这两个参数`appId、userName`，于是加入GET请求参数中请求：

```json
Request:
?appId=123&userName=123
Response:
{"res_code":"0","res_message":"成功","timeMillis":1542516495613,"extData":null,"data":[{"appId":"123","permissionTag":[""],"extData":null}]}
```

其中appId的参数值返回在了页面中，该请求响应报文`Content-Type: text/html`，所以尝试构建XSS，运气好，确实也存在XSS问题：

![alert](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-18/5.png)

# 总结

学习、不断的学习。
