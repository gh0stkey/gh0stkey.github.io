---
layout: post
author: Vulkey_Chen
title: "iOS URL Schemes与漏洞的碰撞组合"
date: 2018-12-08
music-id: 460225644
permalink: /archives/2018-12-08/1
description: "iOS URL Schemes与漏洞的碰撞组合"
---

# 前言

iOS URL Schemes，这个单词对于大多数人来说可能有些陌生，但是类似下面这张图的提示大部分人应该都经常看见：

![wechat](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/0.png)

今天要探究的就是：了解iOS URL Schemes、如何发现iOS URL Schemes、iOS URL Schemes结合漏洞案例。

# iOS URL Schemes

## 基本概念

抛开iOS从URL Schemes的字面意思理解，就是地址协议（**Scheme一般用来表示协议，比如 http、https、ftp 等**），我们所熟知的HTTP协议的URL格式就是：

`http(s)://user:pass@host:port/path?query`

举个例子：`http://gh0st.cn/`，在浏览器输入这个地址，浏览器是使用HTTP协议向 **gh0st.cn** 请求，请求的资源就是 **/** 。

再来看一下iOS URL Schemes的一个例子：`weixin://`，你在Safari浏览器(Mobile)输入这个网址就会提示你` 在"微信"中打开链接吗？`，然后由你选择"取消"或"打开"；**和HTTP协议格式的URL访问流程进行对比，iOS URL Schemes 实际上就是启动一个应用的 URL**，其访问流程是这样的：

`浏览器输入"weixin://" -> iOS识别URL Schemes ->询问是否跳转到微信 -> 确认跳转 -> 从浏览器跳转到微信端`

那么问题就来了，以上所述流程中的"**iOS识别URL Schemes**"，iOS如何识别这段URL Schemes？**iOS官方要求的是APP开发者需要自己定义自己APP的"URL Schemes"，只有APP本身定义(支持)了URL Schemes，iOS才会去识别然后跳转**。

## 定义

一个完整的 URL Schemes 应该分为 Scheme、Action、Parameter、Value 这 4 个部分，中间用冒号 `:`、斜线 `/`、问号 `?`、等号 `=` 相连接。

举个例子：`mst://jump?url=https://gh0st.cn/&title=test`，它对应的4部分就是如下所示：

Scheme（头）: `mst`、Action（动作）: `jump`、Parameter（参数）: `url、title`、Value（值）: `https://gh0st.cn、test`

不同的部分之间有符号相连，它们也有一定的规则(和URL部分规则是一样的)：

- 冒号`:`：在**链接头**和**命令**之间；

- 双斜杠 `//`：在**链接头和命令**之间，有时会是三斜杠 `///`；
- 问号 `?`：在**命令和参数**之间；
- 等号 `=`：在**参数和值**之间；
- **和符号** `&`：在**一组参数和另一组参数**之间。

### 理解

以上述所举的例子：`mst://jump?url=https://gh0st.cn/&title=test`，来简单的说明下这段URL Scheme所产生的效果：

1.跳转到"mst"所对应的APP

2.在APP中执行jump动作（跳转网站）

3.告诉APPjump动作所需的`url`和`title`参数，对应的值分别为`https://gh0st.cn/`和`test`

**可以理解为在APP应用中访问`https://gh0st.cn/`，网页标题为`test`。**

# 寻找iOS APP的URL Schemes

**当你学会了如何寻找APP的URL Schemes，你就算发现了半个漏洞。**

## 获取IPA包

基本的URL Schemes可以在iOS APP中的Info.plist文件中寻找到，而一般你是无法获取到APP的ipa包的，所以需要借助软件获取到这个包。

前提是你需要这两台设备：MacBook、iPhone，如果你只拥有一台iPhone的话也有办法去获取（需要Thor APP，具体方法自行寻找）。

Mac上先安装Apple Configurator 2，然后你需要在该软件中登录你的Apple账户：

![login](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/1.png)

使用iPhone充电线将手机连接Mac，这时候软件中就会显示已经连接Mac的设备：

![iphone](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/2.png)

假设你需要获取微信的URL Schemes，那么你的手机已经安装过了微信，然后使用该软件进行添加，选中设备点击添加按钮，选择应用：

![add](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/3.png)

搜索微信，选中添加：

![add wechat](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/4.png)

当你下载完成看见如下提示的时候，在Finder中按快捷键`Command+Shift+G`，输入`~/资源库/Group Containers/K36BKF7T3D.group.com.apple.configurator/Library/Caches/Assets/TemporaryItems/MobileApps/`

![tip](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/5.png)

软件下载的微信ipa文件就存在该文件夹中：

![ipa](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/6.png)

进入文件夹将ipa文件复制到其他地方：

![move](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/7.png)

然后回到Apple Configurator 2的提示，点击停止即可。

## 获取基本URL Schemes

将IPA包后缀名修改为ZIP，然后解压，进入Payload目录会看见一个.APP后缀名文件，选中文件右击显示包内容：

![view](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/8.png)

找到Info.plist文件并打开，搜索关键词`URLSchemes`：

![find](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/9.png)

被`String`标签所包含的就是微信的URL Schemes：

```xml
<string>wexinVideoAPI</string>
<string>weixin</string>
<string>weixinapp</string>
<string>fb290293790992170</string>
<string>wechat</string>
<string>QQ41C152CF</string>
<string>prefs</string>
```

### 寻找完整URL Schemes

如上已经了解了如何获取最基本的URL Schemes，但是这远远不够，因为完整的URL Schemes有4部分，而目前只找到了第一部分，仅仅能做到的功能就是启动，而想找到更多的非基本URL Schemes需要其他的方法。有很多方法在这里不一一例举了，只例几个常见的思路供你参考。

###  从手机站点页面获取

一般网站都会有这些子域名：m\h5\mobile...

打开这些子域名，利用Chrome的开发者工具(F12)切换为手机模式视图，这样就能模拟手机去访问了：

![Chrome](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/10.png)

那在这里可以在该页面的HTML代码中寻找URL Schemes（前提是你已经知道了基本的URL Schemes）

在这里我从页面的JavaScript代码中发现了很多URL Schemes：

![URL Schemes](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/11.png)

有些还有参数，可以根据命名来猜这些URL Schemes的含义，例如`path: "mst://jump/core/web/jump"`，就可以知道这个是做Web跳转的，那跳转到哪个地址是什么参数控制呢？下面也有对应的告诉我们是`url`参数去控制，也就组成了这样一个URL Scheme: `mst://jump/core/web/jump?url=https://gh0st.cn`

### QRLCode解析地址获取

现在很多网站都支持二维码登录，就比如如下这个网站：

![qrlcode](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/12.png)

保存该二维码进行二维码解析：

![text](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/13.png)

解析得出这是一个URL Scheme，修改json参数url的值为我的网站尝试在浏览器中打开成功的触发了跳转APP，并且在APP中访问了我的网站。

### 逆向APP

不仅是iOS，安卓也支持URL Schemes，而一般的定义是一样的，所以你可以基于`获取基本URL Schemes`这个步骤将.APP文件的后缀去掉，这时候这个文件就变成了一个文件夹拖到Sublime里面全局搜索"**weixin://**"即可。

至于安卓的APK的逆向可以参考我之前的一篇文章< [打造Mac下APK逆向环境到实战接口XSS挖掘](https://gh0st.cn/archives/2018-11-18/1) >，可以在源代码中、所有文件内容中搜索URL Schemes。

![search](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/14.png)

# 漏洞案例

## APP内URL跳转问题

其实严格来讲这不算是漏洞，毕竟利用有限，但又和**一切能产生危害的问题都算漏洞**这句话所冲突，所以在这还是选择列了出来，至于厂商觉不觉得是个安全性问题，还要看他们对“安全风险“的定义。

如何发现这类问题？在上文中我提到了如何发现URL Schemes，只要你发现了这种类型的URL Schemes就可以尝试替换地址为你的地址然后使用浏览器打开查看是否能在APP内跳转到你的地址，当然利用方式也很简单，构建一个HTML页面即可，然后将网址发送给“**受害者**”即可：

```html
<script>
window.location='URL Schemes';
</script>
```

## 凭证窃取（设计不当）

在做一次漏洞挖掘的时候也碰见了很多次这种问题，大概的描述下就是我找到了能在APP中打开网页的入口方式（例如：二维码扫描、URL Schemes动作），让APP访问到我的地址，这样我就可以直接获取到APP中登录后的凭证信息。

![gettoken](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-12-08/15.png)

利用方式和URL跳转的方式是一样的；关于这方面漏洞产生原理得出一个可能“**不太严谨的结论**”：**APP在做HTTP请求的时候默认所有访问的都是信任域，所以带上了本身已经登录的凭证去请求了**。

### 结合漏洞扩大攻击面

在一次APP的漏洞挖掘中发现了一个JSONP劫持的问题，但是在这里只会对APP用户产生影响，在没有二维码扫描的情况下就需要结合URL Schemes来扩大这个漏洞的影响面，而不是局限于self。

利用流程：

用户打开https://gh0st.cn/test.html，test.html内容：

```html
<script>
window.location='mst://jump?url=https://gh0st.cn/jsonp.html';
</script>
```

用户点开之后启动`mst应用`执行`jump动作`，跳转到https://gh0st.cn/jsonp.html，jsonp.html内容：

```html
<script>function test(data){ document.write(JSON.stringify(data)) }</script> <script src="JSONP URL"></script>
```

## URL Schemes劫持

这个漏洞是15年在乌云爆出来的，漏洞编号为：wooyun-2015-0103233，大家可以自行去查看。

这个问题说白了是一个流程上的缺陷，苹果官方没有限制APP定义的URL Schemes名字，导致其他APP也可以定义“支付宝”的URL Schems名字；又因为iOS系统判定URL Schemes优先级顺序与 Bundle ID 有关（一个 Bundle ID 对应一个应用），如果有人精心伪造 Bundle ID，iOS 就会调用恶意 App 的 URL Schemes 去接收相应的 URL Schemes 请求，这就导致了可以被劫持。

# 结尾

还有很多思路等着我们去探寻，此文仅做思路启发。

**Reference:**

>https://sspai.com/post/31500
>
>https://sspai.com/post/44591
>
>WooyunBugID:wooyun-2015-0103233
