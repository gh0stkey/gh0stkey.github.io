---
layout: post
author: Vulkey_Chen
title: "WebFuzzing方法和漏洞案例总结"
date: 2019-11-11
music-id: 1372323745
permalink: /archives/2019-11-11/1
description: "WebFuzzing方法和漏洞案例总结"
---

# WebFuzzing方法和漏洞案例总结

作者：Vulkey_Chen

博客：gh0st.cn

## 背景

之前有幸做过一次线下的议题分享《我的Web应用安全模糊测试之路》，讲解了一些常用的WebFuzzing技巧和案例，该议题得到了很大的回响，很多师傅们也与我进行了交流，但考虑到之前分享过很多思路非常不全面，这里以本篇文章作为一次总结，以实战引出技巧思路（方法）。

我的Web应用安全模糊测试之路议题解读：`https://gh0st.cn/archives/2018-07-25/1` （推荐阅读）

## 实战案例

以下分享的案例都是个人在参与项目或私密众测邀请时遇见的真实案例，案例大多基于个人收集和整理的`FuzzDict项目`（字典库）。

![fuzzdict](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/fuzzdict.png)

其中涉及的一些漏洞可能无法作为Fuzzing归类，这里也进行了强行的归类，只是想告诉大家漏洞挖掘中思路发散的重要性，个人也觉得比较经典。

**注：** 漏洞案例进行了脱敏以及细节上的修改

### 案例-Add

#### [SQLi注入漏洞]

1.获得项目子域：`https://xxx.com`

2.目录扫描发现`/user/`目录，二层探测发现`/register`接口，其意为：“注册”

![-w538](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722710437139.jpg)

3.根据返回状态信息去Fuzz用户名、密码参数->结果：`uname\pwd`

4.对`uname参数`进行SQL注入测试，简单的逻辑判断存在

5.注入点使用16进制的方式无法注入，SQLmap参数`--no-escape`即可绕过

![-w648](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722712162025.jpg)


#### [拒绝服务]图片验证码

图片验证码DoS（拒绝服务攻击）这个思路很早就出来了，当时的第一想法就是采集样本收集参数，使用搜索引擎寻找存在图片验证码的点：

![-w800](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722714688846.jpg)

根据这些点写了个脚本进行半自动的参数收集：

![-w1134](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722718429294.jpg)

在漏洞挖掘的过程中，经常会抓取图片验证码的请求进行Fuzz：

图片验证码地址：https://xxx/validateCode
![-w606](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722716485524.jpg)

Fuzz存在潜藏参数，可控验证码生成大小：

![-w706](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722718790178.jpg)


#### [JSONP]无中生有

获得一个敏感信息返回的请求端点：`http://xxx/getInfo`

使用`callback_dict.txt`字典进行Fuzz

![-w536](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722720029660.jpg)

成功发现`callback`这个潜藏参数

![-w907](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722721391525.jpg)

#### [逻辑漏洞]响应变请求

这里同样是获得一个敏感信息返回的请求端点：`http://xxx/getInfo`

返回的信息如下所示：

```json
{"responseData":{"userid":"user_id","login":"user_name","password":"user_password","mobilenum":"user_mobilephone_number","mobileisbound":"01","email":"user_email_address"}}
```

尝试了一些测试思路都无法发现安全漏洞，于是想到了`响应变请求`思路

将响应报文的JSON字段内容转化为HTTP请求的字段内容（BurpSuite插件项目：`https://github.com/gh0stkey/JSONandHTTPP`）：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722723549196.jpg)

将相关的信息字段内容替换为测试账号B的信息（例如：login=A -> login=B）

发现无法得到预期的越权漏洞，并尝试分析该网站其他请求接口对应的参数，发现都为大写，将之前的参数转换为大写

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722724827925.jpg)

继续Fuzz，结果却出人意料达到了预期

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722725077041.jpg)


### 案例-Update

#### [逻辑漏洞]命名规律修改

一个登录系统，跟踪JS文件发现了一些登录后的系统接口，找到其中的注册接口成功注册账户进入个人中心，用户管理处抓到如下请求：

```http
POST URL: https://xxx/getRolesByUserId
POST Data: userId=1028
```

返回如下信息：

![-w1068](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722726547968.jpg)

可以看见这里的信息并不敏感，但根据测试发现userId参数可以进行越权遍历

根据url判断这个请求的意思是根据用户id查看用户的身份，url中的驼峰方法(**getRolesByUserId**)惊醒了我，根据命名规则结构我将其修改成**getUserByUserId**，也就是根据用户id获取用户，也就成为了如下请求包

```http
POST URL: https://xxx/getUserByUserId
POST Data: userId=1028
```

![-w708](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722727698302.jpg)

成功返回了敏感信息，并通过修改userId可以越权获取其他用户的信息


#### [逻辑漏洞]敏感的嗅觉

在测一个刚上线的APP时获得这样一条请求：

```http
POST /mvc/h5/jd/mJSFHttpGWP HTTP/1.1
……

param={"userPin":"$Uid$","addressType":0}
```

而这个请求返回的信息较为敏感，返回了个人的一些物理地址信息

![-w545](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722729757171.jpg)

在这里`param参数`是json格式的，其中`"userPin":"$Uid$"`引起我注意，敏感的直觉告诉我这里可以进行修改，尝试将`$Uid$`修改为其他用户的用户名、用户ID，成功越权：

![-w560](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722731124416.jpg)


#### [逻辑漏洞]熟能生巧

收到一个项目邀请，全篇就一个后台管理系统。针对这个系统做了一些常规的测试之后除了发现一些 没用的弱口令外(无法登录系统的)没有了其他收获。

分析这个后台管理系统的URL:`https://xxx/?m=index`，该URL访问解析过来 的是主⻚信息。

尝试对请求参数`m`的值进行`Fuzz`，7K+的字典进行Fuzz，一段时间之后收获降临

![-w792](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722732301271.jpg)


获得了一个有用的请求:`?m=view`，该请求可以直接未授权获取信息

![-w741](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722732785662.jpg)


### 案例-Delete

#### [逻辑漏洞]Token限制绕过

在测业务的密码重置功能，发送密码重置请求，邮箱收到一个重置密码的链接：`http://xxx/forget/pwd?userid=123&token=xxxx`

这时候尝试删除token请求参数，再访问并成功重置了用户的密码：

![-w234](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722735366150.jpg)

#### [SQLi辅助]参数删除报错

挖掘到一处注入，发现是root（DBA）权限：

![-w457](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722736532748.jpg)

但这时候，找不到网站绝对路径，寻找网站用户交互的请求`http://xxx/xxxsearch?name=123`，删除`name=123`，网站报错获取绝对路径：

![-w460](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722737353104.jpg)

成功通过SQLi漏洞进行GetWebshell

![-w265](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-11-11/15722737780009.jpg)


## 字典收集

### 项目推荐

**注：** 以下项目来自“米斯特安全团队”成员编写或整理发布

BurpCollector(BurpSuite参数收集插件)：`https://github.com/TEag1e/BurpCollector`

Fuzz字典：`https://github.com/TheKingOfDuck/fuzzDicts`

### 借助平台

1.依靠Github收集：`https://github.com/search?q=%22%24_GET%22&type=Code`

2.借助zoomeye、fofa等平台收集

## 总结

核心其实还是在于漏洞挖掘时的心细，一件事情理解透彻之后万物皆可Fuzz

平时注意字典的更新、整理和对实际情况的分析，再进行关联整合
