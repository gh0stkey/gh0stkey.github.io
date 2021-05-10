---
layout: post
author: Vulkey_Chen
title: "浅析通过'监控'来辅助进行漏洞挖掘"
date: 2017-10-28
permalink: /archives/2017-10-28/1
description: "这篇文章总结了一些笔者个人在漏洞挖掘这一块的姿势"
---

# 前言

这篇文章总结了一些笔者个人在漏洞挖掘这一块的"姿势"，看了下好像也没相关类似TIPs或者文章出现，就写下此文。
<!-- more -->

"监控"一词，相信大家很常见，例如：xxx酒店厕所被安装监控、xxx明星被狗仔24小时监控，也有奶权师傅写过的**《Python系列之——利用Python实现微博监控》**和笔者写过的**《从编写知乎粉丝监控到漏洞挖掘再到盗号》**。

但这跟"漏洞挖掘"联系起来的话似乎就让人摸不着头脑，其实不然，通过"监控"可以帮我们做很多事。

# 监控狂人的修炼之路

以大家最常见的一个东西起->扫描器，其可以辅助渗透测试工程师更好更简单的进行漏洞的信息发现，但是发现漏洞后要测试漏洞的时候哪些验证步骤是不是就很头疼呢？通过"监控"去完成是不是更好~

在我们做盲测漏洞的时候可能会考虑到一些问题，最主要的问题肯定就是什么时候平台能收到结果呢？

这时候就可以对接一些平台的`API`进行**关键字监控**了。

使用`ceye`的`API`接口对`SSRF`漏洞进行**长期监控**：

```
API: /api/record?token={token}&type={dns|request}&filter={filter}
token: your ceye token.
type: type of query, 'dns' or 'request'.
filter: match {filter}.{your domain}.ceye.io rule, but limit 20.
```

用`Python`写一个监控然后再写个发信，这样在有些环境下迟迟到来的漏洞信息就会立即被在床上玩手机的你知道了。

**其实如上的思路还可以利用很多结合dnslog的原理去监控，这里借助了ceye这个平台的API，还可以参考Bugscan的 dnslog平台 自己去搭建一个然后噼里啪啦，这里其实Burpsuite的Scanner模块就借助了这样的思路去更快捷的扫描发现SSRF漏洞，但是却没办法做到长时间的"蛰伏期"（也就是在一些情况下，结果是需要一个等待才能到达），那其实大家可以继续开拓自己的思维去想些更有价值的东西。**

如上说的一些"姿势"可能是废话了，很多人都自己多多少少都有想过也实现了，但是别急，前菜清淡，但主菜呢，邀君共品~

很多的时候，朋友就会问我xxCMS后台怎么`GetWebshell`，为什么那些牛人分分钟都可以`Getwebshell`了？除了看代码我怎么快速的获取`GetWebshell`的"姿势"呢？

一般后台`GetWebshell`的"姿势"有这几种：`后台代码/命令执行`、`代码闭合`、`操作缓存`、`文件上传`等等...

那其实很多的都会本文件打交道，不如先造个文件监控出来：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x00.png)

造完监控，不如来写个后台`GET/POST`请求Fuzz，在做这个Fuzz的时候处理的时候遇到很多坑，脚本写的不是很好就不拿出来丢人现眼了~

这里我做的Fuzz是结合`Burpsuite`的`日志`，进行筛选然后Fuzz：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x01.png)

这里筛选的脚本是根据 <https://github.com/tony1016/BurpLogFilter> 去造了一个2.7版本的~

其实这个脚本大概的功能实现是这样的：

设置**GET/POST**传输参数对应值为随机字符串(这里使用了python的uuid)，会生成一个Fuzz`历史Log`文件，以便跟文件监控对比。

历史Log对比文件监控：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x02.png)

这里Fuzz之后发现有两个文件被修改了，而这两个文件因为有CMS特征的存在就不一一例举了。为什么会被修改呢？因为这里传递的值被写入了文件中，找到对应功能点发现有CSRF，一结合就造成了`CSRF+后台GetWebshell`~

通过如上的姿势测试了不少的CMS，又在CNVD和补天提交相对应也获得了不少的Bounty。

在利用这种姿势的情况下偶然发现一个CMS前台访问的时候会生成一个缓存日志文件，而缓存日志文件的内容会记录用户的IP：

```php
<?php
127.0.0.1 GET /center/useredit/
die();
?>
```

那其getip()函数的核心代码：

```php
......
if($HTTP_SERVER_VARS["HTTP_X_FORWARDED_FOR"]){
    $ip = $HTTP_SERVER_VARS["HTTP_X_FORWARDED_FOR"];
}elseif($HTTP_SERVER_VARS["HTTP_CLIENT_IP"]){
    $ip = $HTTP_SERVER_VARS["HTTP_CLIENT_IP"];
}elseif ($HTTP_SERVER_VARS["REMOTE_ADDR"]){
    $ip = $HTTP_SERVER_VARS["REMOTE_ADDR"];
}elseif (getenv("HTTP_X_FORWARDED_FOR")){
    $ip = getenv("HTTP_X_FORWARDED_FOR");
}elseif (getenv("HTTP_CLIENT_IP")){
    $ip = getenv("HTTP_CLIENT_IP");
}elseif (getenv("REMOTE_ADDR")){
    $ip = getenv("REMOTE_ADDR");
}
......
```

可以通过`伪造XFF头`进行PHP代码的闭合造成前台无限制GetWebshell，但是缓存文件的路径是：/www/center/temp/**md5(text)**.php

通过代码了解到其的文件的命名规则是`md5(time())`，那其实通过记录前后的一部分时间戳加上Burpsuite的Intruder模块进行md5加密枚举就行了。

那其实还可以做一些Fuzz然后实时监控Mysql的SQL执行语句：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x03.png)

首先来看下Mysql的`记录Log功能`开了没有：

```mysql
SHOW VARIABLES LIKE "general_log%";
```

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x04.png)

看见其的功能OFF了~只要设置下ON就行了：

```mysql
SET GLOBAL general_log = 'ON';
```

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x05.png)

使用BareTail进行监控或者自己根据Log的文本规则监控就行了：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-10-28/0x06.png)

# 结尾

本文不足之处欢迎指出，也希望大家可以GET到一点点思路，欢迎跟笔者交流。

下一篇已经在草稿中了，是关于自动化Fuzz方面的内容，期待吧。
