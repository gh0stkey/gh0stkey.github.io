---
layout: post
author: Vulkey_Chen
title: "基于BurpSuite快速探测越权-Authz插件"
date: 2019-06-27
music-id: 
permalink: /archives/2019-06-27/1
description: "基于BurpSuite快速探测越权-Authz插件"
---

# BurpSuite - Authz

## 背景

在平时的测试中，会经常的碰到业务功能较多的站点，如果想全面又快速的完成逻辑越权漏洞的检测不得不借助Authz插件去辅助检测越权问题。

## Authz的工作原理

我们平时做测试的时候发现越权问题都是基于修改ID的方式：**A的ID改成B的ID然后进行请求查看是否可以越权获取到信息**，**或当ID的规律已知情况下基于Burp Intruder模块直接去遍历ID**。**而基于Authz的检测是不一样的，其是将用户认证的HTTP请求头进行修改（Cookie之类的），然后通过响应长度、响应状态码判断是否存在越权**；**从本质上来讲没有任何区别，只是换了一个角度**，但这样的**好处**是一定程度上的减少了测试的时间（例如：**一个商城的业务系统，你有A、B账户，A账户买了个商品获得一个订单信息请求，当你想测试是否能越权获取B账户订单时就需要使用B账户去再购买，然后判断测试。**）

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409209407.jpg)

BurpSuite Authz插件界面

## 安装Authz插件

Github地址：<https://github.com/portswigger/authz>

**快速安装->在BurpSuite的BApp Store应用市场可以直接下载安装：**

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409359506.jpg)



## 使用Authz插件检测

使用插件检测的前提条件：**同个业务系统中两个测试账号**

作用：A账户用于功能的操作，B账户用于提供凭证（Cookie或者其他的用户身份凭证请求头）

**举例说明：**

一个业务系统，将A、B账户登入，同时获取B账户的Cookie或者其他的用户身份凭证请求头，填入到Authz的New Header里：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409465945.jpg)

A账户去请求（Burp别忘了监听着），寻找读取类请求（该类请求要包含ID之类的特征）然后右键请求包将该请求发送到Authz插件内：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409564945.jpg)

发送的请求会在Burp的Authz的Tab标签窗口内：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409674592.jpg)

当收集的差不多了，点击run跑起来：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409749591.jpg)

结果会在Responses处显示：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409846702.jpg)

当原响应内容长度、响应状态码和被修改后请求的响应内容长度、响应状态码一致则会绿。

也就代表着存在越权，单击选择一行即可在下面展示出请求、响应的报文：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596409926174.jpg)

这里经过进一步检验（**理论上不需要检验，但出于对测试的严谨态度还是检验一下比较好～**）顺利的发现了三枚越权访问漏洞。

一个业务系统测完之后就Clear掉所有的东西，接着下一个业务系统咯：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-06-27/15596410022495.jpg)


## Authz的优点和缺点总结

优点：使用简单、省时省力

缺点：只是适用于检测越权读取类操作，删除编辑类操作还需人工判断。
