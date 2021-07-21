---
layout: post
author: Vulkey_Chen
title: "利用SourceMap还原网站原始代码(前端)"
date: 2020-01-08
music-id: 
permalink: /archives/2020-01-08/2
description: "利用SourceMap还原网站原始代码(前端)"
---

# 利用SourceMap还原网站原始代码(前端)

作者：key

## 说明

现在越来越多网站使用前后端分离技术，利用Webpack技术将JS类拓展语言进行打包，当然很多都是配套使用，例如Vue（前端Javascript框架）+Webpack技术；

这种技术也在普及，并且转向常态化，对渗透测试人员来说极其不友好：

1.增加了前端代码阅读的时间（可读性很差）
2.由原因1间接造成了前端漏洞的审计困难性

但是也具备一定的好处：

1.采用这种模式，后端接口将完全暴露在JS文件中

除此之外，如果生成了Source Map文件可以利用该文件还原网站原始前端代码（关于技术名词的具体含义请自行查询百科）

主流浏览器都自带解析Source Map文件功能（开发者工具-Sources【火狐下是调试器】）：

![-w270](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776956466997.jpg)

展开可以看见具体文件和代码：

![-w267](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776957736400.jpg)

但是文件过多的情况下，单个查看繁琐，不便于搜索（浏览器的开发者工具支持全局文件搜索，但搜索速度较慢），使用`restore-source-tree`可以解决这一问题。

## restore-source-tree 安装

原作者的有BUG，使用国外友人修复后的版本：https://github.com/laysent/restore-source-tree，安装步骤如下：

```shell
git clone https://github.com/laysent/restore-source-tree
cd restore-source-tree
sudo npm install -g
```

## Source Map文件还原

在这类JS文件下通常会有一个注释：

![-w568](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776960439534.jpg)

![-w717](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776960674880.jpg)

map文件就是js文件所在目录下，拼接URL即可访问，将其下载下来：

`wget http://hostname/static/js/app.fedfe85b2fdd8cf29dc7.js.map`

`restore-source-tree`进行还原：

```shell
# -o 参数是指定输出目录，若不适用则为默认的output目录
restore-source-tree app.fedfe85b2fdd8cf29dc7.js.map
```

![-w611](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776962157760.jpg)

成功获得原代码：

![-w281](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-01-08/15776962339667.jpg)


# Reference

https://yukaii.tw/blog/2017/02/21/restore-source-code-from-sourcemap-file/
