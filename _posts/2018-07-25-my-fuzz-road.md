---
layout: post
author: Vulkey_Chen
title: "我的Web应用安全模糊测试之路"
date: 2018-07-25
permalink: /archives/2018-07-25/1
description: "议题解读《我的Web应用安全模糊测试之路》"
---
# 前言

坏蛋(春秋社区)跟我说要我准备议题的时候，我是懵逼的～仔细想了一下自己这么菜，能讲什么呢？

思考了很久最终定了这个标题：《我的Web应用安全模糊测试之路》

这篇议题主要围绕我做Web应用安全测试的时候所运用的一些技巧和思路。

![title](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/0.png)

# 我的Web应用安全模糊测试之路

## 什么是Web应用中的模糊测试？

Web应用是基于什么进行传输的？HTTP协议。

模糊测试是什么？Payload随机。

Payload放哪里？HTTP请求报文格式是什么？**请求行(请求方式 URI HTTP/1.1)**、**请求头**、**请求报文主体(POST Data)**。

**模糊测试秘籍->增(Add) && 删(Del)**

### 被固化的测试思维

我列出一个请求，边看边思考你会怎么测试这个请求呢？

HTTP请求报文(Request)：

```http
GET /uc/getInfo HTTP/1.1
Host: gh0st.cn
Origin: http://gh0st.cn
...
```

HTTP响应主体(Response Content):

```json
{
    "id": "1024",
    "realName": "yudan",
    "mobilePhone": "13888888888",
    "cardNo": "111111111111111111"
}
```

看到这想必你已经知道自己要测试的内容是什么了，一般来讲很多人会先注意`Origin`这个HTTP请求报文头，看响应的HTTP头：

```http
...
Access-Control-Allow-Origin: http://gh0st.cn
Access-Control-Allow-Crdentials: True
Access-Control-Allow-Methods: OPTION, POST, GET
...
```

如果我修改Origin的值为`http://qianan.cn`，返回的也是`Access-Control-Allow-Origin: http://qianan.cn`，那就代表着这里存在CORS跨域资源共享(任意域)的问题，具体在这里就不多说了参考我之前的一篇文章：http://gh0st.cn/archives/2018-03-22/1

这里也许会有什么匹配之类的验证，一般的两种绕过方法：

1.子域名(`http://{domain}.mst.cn/ -> http://gh0st.cn.mst.cn/`)

2.域名前缀(`http://{a-z}{domain} -> http://agh0st.cn/`)

也许到这里部分人的测试已经Over了～那么我还会继续测试下去，如何测？往下看↓

### 模糊测试之增

#### 增 - 入门

观察响应报文格式：

```json
{
    "id": "1024",
    "realName": "yudan",
    "mobilePhone": "13888888888",
    "cardNo": "111111111111111111"
}
```

这里的格式为JSON格式，那么跟JSON有关的漏洞最先想到的是什么？

没错，JSONP跨域劫持（想科普下？看这里-> http://gh0st.cn/archives/2018-03-22/1）。

JSONP跨域劫持需要具备的条件是回调参数，而这里并没有，没有回调参数，那我就增加一个回调参数，如下是我的一份字典：

![1.png](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/1.png)

使用BurpSuite的Intruder模块，进行枚举测试：

```
GET /uc/getInfo?callback=mstkey HTTP/1.1
GET /uc/getInfo?cb=mstkey HTTP/1.1
GET /uc/getInfo?jsonp=mstkey HTTP/1.1
...
```

终于某一条请求得到了我想要的结果：

```json
mstkey({"id":"1024","realname":"yudan","mobilePhone":"13888888888","cardNo":"111111111111111111"})
```

那在这里我就可以构建PoC了：

```html
<script>function mstkey(data){alert(JSON.stringify(data));}</script>
<script src="http://gh0st.cn/uc/getInfo?callback=mstkey"></script>
```

#### 增 - 进阶

除了上面所说的增加回调参数以外，还可以增加什么呢？

![URL](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/2.png)

增加的参数和值可以**分析网站数据**、**关联网站数据**、**整合自用字典与网站字段结合**。

响应报文转换：

```json
{
    "id": "1024",
    "realName": "yudan",
    "mobilePhone": "13888888888",
    "cardNo": "111111111111111111"
}
```
转换为HTTP请求参数 **键=值** 格式：

```
id=1024
realName=yudan
mobilePhone=13888888888
cardNo=111111111111111111
```

初次之外还有什么？当然是使用自用字典和如上总结的进行整合：

![add](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/3.png)

注意一点，参数都整理好之后，对应的值采用B账号的对应值，因为这样才会有差异，才能进行分析是否存在相关的漏洞，一般加参数会存在**越权**问题～

#### 增 - 深入

很多小伙伴挖漏洞的时候核心业务挖不动那肯定怼一些边缘业务和一些后台系统了，大多数人应该都遇见过这样的问题，找到了一个后台的地址点进去是管理界面，突然的有js跳转到登录界面去了，但是查看页面代码却能获取到很多的后台接口～

很多人会选择登录爆破、未授权接口使用这些常规操作类型去测试，可能测完就会抛掉了，而我之前测试某项目的时候碰见的就是当我在接口后面加上admin=1的时候响应报文返回了这样的头：

```http
Set-Cookie: xxxxxx=xxxxxxx
```

给我设置了一个Cookie，我使用这个Cookie直接就进入了后台。

![hidden](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/4.png)

### 模糊测试之删

在这里有一处实际场景：

![mail](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/5.png)

其流程是这样的：输入邮箱->点击修改邮箱->发送修改链接到该邮箱->邮箱打开修改链接->成功修改

明显流程就有问题，按照常的流程来说应该先验证原邮箱(手机号)再做修改操作。

点击修改邮箱按钮获取到的请求如下：

```http
POST /uc/changeEmail HTTP/1.1
Host: **
...

mail=admin%40gh0st.cn&token=md5(token)
```

这里有Token保护，用来防御CSRF的，这里将token置空或者**删除 键=值** 即可绕过，这里是因为token并没有实际的去做校验，也就是"表面安全"。

### 增的组合拳

在"删"这个环节里说到了删除CSRF的`token`绕过的方法，但不久之后厂商进行了修复。。。

它成功的让token校验了，这里无法再使用原来的方法了，但是在这里观察请求和响应：

```http
POST /uc/changeEmail HTTP/1.1
Host: **
...

mail=admin%40gh0st.cn&token=md5(token)
```

响应主体：

![mail](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/6.png)

这里输入一个错误的或者已经绑定过的会提示输入错误，然后回显请求报文中的POST Data参数mail的值～

也就是说在这里也许会存在CSRF + POST XSS，但是因为Token问题没办法利用～我们该怎么办？

这里思来想去，只能尝试设想后台的参数接收->输出代码：

```php
<?php
    echo $_REQUEST['mail'];//注意这里使用的是$_REQUEST 默认情况下包含了 $_GET，$_POST 和 $_COOKIE 的数组。
?>
```

如果是如上的接收输出，那么在这里，我修改链接为：

`http://gh0st.cn/uc/changeEmail?mail=admin@gh0st.cn`

神奇的发现页面回显了admin@gh0st.cn到界面上了，但是并不会去走修改邮箱，也就是说这里还是需要POST请求才会走修改邮箱流程，这里我先有了反射XSS的想法，但是奈何过滤了...

于是衍生了第二个思路搭配点击劫持～（科普一下？->http://gh0st.cn/archives/2017-12-20/1）

透明化修改邮箱界面，然后获取修改邮箱按钮位置，做一个一模一样的按钮放在修改邮箱按钮之上，诱导用户点击这个按钮实际上是点击了修改邮箱的按钮～

![clickjacking](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-07-25/7.png)



# 结尾

感谢有你，每一个你，都要活的精彩。

