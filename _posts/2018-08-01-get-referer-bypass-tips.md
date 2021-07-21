---
layout: post
author: Vulkey_Chen
title: "GET请求Referer限制绕过总结"
date: 2018-08-01
permalink: /archives/2018-08-01/1
description: "GET请求Referer限制绕过总结"
---

# 前言

在做测试的时候会遇见这样几个漏洞场景：

1. JSONP跨域劫持
2. 反射XSS
3. GET请求类型攻击

但是，在相对安全的情况下，都会有Referer(HTTP请求头)的限制。那么该如何去做绕过呢？



# 正文

## 什么是Referer？

Referer是请求头的一部分，假设A站上有B站的链接，在A站上点击B站的链接，请求头会带有Referer，而Referer的值为A站的链接；这也就是为什么上文所说的场景，遇见了Referer的限制就可能GG了。

![0](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x00.png)

## 绕过之道

### 常规绕过

一个实际场景：

![referer](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x01.png)

先来说说一些常规化的东西：

- `子域名方式`

使用子域名的方式进行绕过：

![subdomain](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x02.png)

- `域名前增加`

在域名前面增加随机的a-z和0-9也可以进绕过：

![rand](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x03.png)

- `？号` 

将域名作为GET请求参数进行绕过：

![subdomain](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x04.png)

### 打破常规

#### 无Referer

之前在做测试的时候，将Referer头删除也可以绕过，但是在真正的利用中能不能去实现呢？是可以的。

在HTML标签中有这样一个标签`<meta>`，而这个标签是表示无Referer，就是如下的代码：

```html
<meta name="referrer" content="never">
```

我原来的PoC为：

```html
<html>
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://127.0.0.1/test.php">
      <input type="submit" value="Submit request" />
    </form>
    <script>
      document.forms[0].submit();
    </script>
  </body>
</html>
```

修改之后的PoC为：

```html
<html>
  <meta name="referrer" content="never">
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://127.0.0.1/test.php">
      <input type="submit" value="Submit request" />
    </form>
    <script>
      document.forms[0].submit();
    </script>
  </body>
</html>
```

![null referer](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x05.png)

#### 与其他资源组合

##### 超链接

在上文就提到了A站有B站的链接，在A站点击B站的链接，Referer就为A站的链接了。那么在这里我能否使用白名单域下的业务做超链接，链接地址为A站存在问题的链接再搭配一个点击劫持或者诱导的方式进行组合攻击？

*例如gh0st.cn做了Referer的限制：*

| Referer                                 | State |
| --------------------------------------- | ----- |
| http://gh0st.cn (Current Domain)        | YES   |
| http://www.hi-ourlife.cn (Other Domain) | NO    |
| http://a.gh0st.cn (SubDomain)           | YES   |

**实际场景：**

- 公开信息对外

在个人中心处可以编辑个人的微博地址：

![weibo](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x06.png)

微博地址是对外的公开信息：

![weibo](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x07.png)

那么结合一下点击劫持或者用户常规的点击了～那就GGGGGGG了～

- 论坛

现在很多厂商都有自己的开放论坛，特别是Discuz这种很多，而Discuz回复是可以使用超链接的：

回复这样的格式：`[url=u]t[/url]` u部分为地址，t部分为地址名字～

##### URL跳转

302跳转是否可以？NO，不可以。

这里的URL跳转是JavaScript的URL跳转。

常见的两个：

```javascript
window.location.href="url";
window.open("url");
```

###### 反射XSS(Referer限制)

1. 这里我已经有一个存在任意URL跳转漏洞了：

`http://test.vulkey.cn/link.php?url=http://www.hi-ourlife.com`

![js](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x08.png)

2. 我有一个反射XSS漏洞：

`http://vulkey.cn/jsonp.php?callback=vulkey`

当 `referer = a.com` :

![xss](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x09.png)

当 `referer = vulkey.cn` :

![xss](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x10.png)

当 `referer = *.vulkey.cn` :

![xss](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x11.png)

这个接口验证了Referer使用之前的方法没办法绕过，于是采用组合拳搭配。 

于是有了如下的构建：`http://test.vulkey.cn/link.php?url=http://vulkey.cn/jsonp.php?callback=vulkey<svg/onload=alert(1)>`

![xss](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x12.png)

###### JSONP劫持+反射XSS+URL跳转

这个案例是基于上面反射XSS案例的，现在已知的三个问题：

1. JSONP接口 `http://vulkey.cn/jsonp.php?callback=vulkey` **有Referer限制**
2. 反射XSS `http://vulkey.cn/jsonp.php?callback=vulkey<svg/onload=alert(1)>` **有Referer限制**
3. JavaScript URL跳转 `http://test.vulkey.cn/link.php?url=http://www.hi-ourlife.com` 

一般JSONP跨域劫持的PoC是这样的：

```html
<script>function jsonp2(data){alert(JSON.stringify(data));}</script>
<script src="url"></script>
```

但是因为有Referer限制，就不能在自己的站点上做PoC了，就只能利用反射XSS漏洞构建PoC：

`http://vulkey.cn/jsonp.php?callback=%3Cscript%3Efunction+vulkey(data){alert(JSON.stringify(data));}%3C/script%3E%3Cscript+src=%22http://vulkey.cn/jsonp.php?callback=vulkey%22%3E%3C/script%3E`

但仅仅如此是不够是因为XSS有Referer来源的限制，所以最终的PoC应该是这样的：

`http://test.vulkey.cn/link.php?url=http://vulkey.cn/jsonp.php?callback=%253Cscript%253Efunction%2bvulkey%28data%29%7Balert%28JSON.stringify%28data%29%29%3B%7D%253C%2fscript%253E%253Cscript%2bsrc%3D%2522http%3A%2f%2fvulkey.cn%2fjsonp.php%3Fcallback%3Dvulkey%2522%253E%253C%2fscript%253E`

![bypass](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-01/0x13.png)

也就是说在这里JS的URL跳转解决了XSS的Referer限制问题，而XSS又解决了JSONP接口的Referer限制问题，这是一个联合组合拳。如果你发现的XSS没有Referer限制则不需要这么"麻烦"。

# 结尾

文中总结一些小的TIPS，针对我遇到的实际案例进行了漏洞的复现截图，打开思维其实还有更多更好的思路，有机会后期会写出来。
