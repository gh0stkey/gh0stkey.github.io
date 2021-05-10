---
layout: post
author: Vulkey_Chen
title: "Wfuzz高阶功法"
date: 2018-10-28
music-id: 557583281
permalink: /archives/2018-10-28/3
description: "Wfuzz高阶功法"
---

# Wfuzz高阶功法

Author: Vulkey_Chen

Blog: gh0st.cn

## 模块

之前两篇文章中已经记录过了payloads和printers模块，所以就不在这继续记录。

### Iterators

BurpSuite的`Intruder`模块中Attack Type有Sniper(狙击手)、Battering ram(撞击物)、Pitchfork(相交叉)、Cluster bomb(集束炸弹)～

wfuzz也可以完成这样的功能，将不同的字典的组合起来，那就是`Iterators`模块。

使用参数`-m 迭代器`，wfuzz自带的迭代器有三个：`zip`、`chain`、`product`，如果不指定迭代器，默认为`product`迭代器。

#### zip

命令：

```shell
wfuzz -z range,0-9 -w dict.txt -m zip http://127.0.0.1/ip.php?FUZZ=FUZ2Z
```

结果如下：

![0x04](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x04.png)

该命令的意思：设置了两个字典。两个占位符，一个是`range`模块生成的`0、1、2、3、4、5、6、7、8、9 ` 10个数字，一个是外部字典dict.txt的9行字典，使用**zip迭代器组合这两个字典**发送。

**zip迭代器的功能**：字典数相同、一一对应进行组合，**如果字典数不一致则多余的抛弃掉不请求，如上命令结果就是数字9被抛弃了因为没有字典和它组合**。

#### chain

命令：

```shell
wfuzz -z range,0-9 -w dict.txt -m chain http://127.0.0.1/ip.php?FUZZ
```

结果如下：

![0x05](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x05.png)

该命令设置了两个字典，一个占位符FUZZ，**使用chain迭代器组合这两个字典**发送。

**chain迭代器的功能**：通过返回结果就能看出来`chain`迭代器的功能了，**这个迭代器是将所有字典全部整合（不做组合）放在一起然后传入占位符FUZZ**中。

#### product

命令：

```shell
wfuzz -z range,0-2 -w dict.txt -m product http://127.0.0.1/ip.php?FUZZ=FUZ2Z
```

结果如下：

![0x06](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x06.png)

该命令的意思：设置了两个字典，两个占位符，一个是`range`模块生成的`0、1、2` 3个数字，一个是外部字典dict.txt的3行字典，使用**product迭代器组合这两个字典**发送。

**product迭代器的功能**：通过返回结果，知道了请求总数为9，请求的payload交叉组合：

![0x07](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x07.png)

### Encoders

wfuzz中**encoders模块**可以实现编码解码、加密，它支持如下图中所列转换功能：

![0x08](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x08.png)

#### 使用Encoders

**正常使用：**

- `wfuzz -z file --zP fn=wordlist,encoder=md5 URL/FUZZ`

  看过第一章的应该都能理解意思了，这里新增的就是`encoder=md5`，也就是使用`Encoders`的`md5`加密。

- `wfuzz -z file,wordlist,md5 URL/FUZZ`

  这里简写了第一条命令，一般都使用这条命令来调用Encoders

**使用多个Encoder：**

- 多个转换，使用一个`-`号分隔的列表来指定

  `wfuzz -z file,dict.txt,md5-base64 http://127.0.0.1/ip.php\?FUZZ`

  ![0x09](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x09.png)

- 多次转换，使用一个`@`号分隔的列表来按照**从右往左顺序**多次转换（这里让传入的字典先md5加密然后base64编码）

  `wfuzz -z file,dict.txt,base64@md5 http://127.0.0.1/ip.php\?FUZZ`

  ![0x10](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x10.png)



### Scripts

之前说了wfuzz支持插件，其本身也有很多插件，插件大部分都是实现扫描和解析功能，插件共有两大类和一类附加插件：

- passive：分析已有的请求和响应（被动）
- active：会向目标发送请求来探测（主动）

- discovery：自动帮助wfuzz对目标站进行爬取，将发现的内容提供给wfuzz进行请求

Wfuzz默认自带脚本如下：

![0x11](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x11.png)



#### 使用Scripts

我想使用`Scripts`中的`backups`模块，可以先试用`--script-help`参数来看如何关于这个模块的信息：

`wfuzz --script-help=robots`

![0x12](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x12.png)

从如上结果中可以知道这个模块不需要设置参数，该模块解析robots.txt的并且寻找新的内容，，至于到底寻找什么，就需要动手实践下了～

在本地建一个robots.txt：

![0x13](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x13.png)

使用如下命令：

```shell
wfuzz --script=robots -z list,"robots.txt" http://127.0.0.1/FUZZ
```

`--script`是使用脚本模块的参数，这时候就有个疑惑命令为什么要加上list呢？因为在这里`robots`脚本只是解析`robots.txt`规则的，所以你需要告诉wfuzz去请求哪个文件而这里我写的就是`robots.txt`就可以解析（假设 http://127.0.0.1/t.txt 的内容也是robots的就可以写成这样的命令`wfuzz --script=robots -z list,"t.txt" http://127.0.0.1/FUZZ` ）

![0x14](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x14.png)

从如上图中得知wfuzz解析robots.txt的内容然后请求解析之后获得的路径。

#### 自定义插件

使用wfuzz可以自己编写wfuzz插件，需要放在`~/.wfuzz/scripts/`目录下，具体如何编写可以参考已有的插件：https://github.com/xmendez/wfuzz/tree/master/src/wfuzz/plugins/scripts



## 技巧

### Recipes

Wfuzz可以生成一个recipes用来保存命令，方便下次执行或者分享给别人。

生成一个recipes：

```shell
wfuzz --script=robots -z list,"robots.txt" --dumo-recipe outrecipe URL/FUZZ
```

使用某个recipes：

```shell
wfuzz --recip outrecipe
```

### 网络异常

Wfuzz扫描的时候出现网络问题，如DNS解析失败，拒绝连接等时，wfuzz会抛出一个异常并停止执行使用`-Z`参数即可忽略这些错误继续执行。

出现错误的payload会以返回码`XXX`来表示，**Payload中还有出现的错误信息**。

### 超时

使用wfuzz扫描会遇到一些响应很慢的情况，wfuzz可以设置超时时间。

参数`--conn-delay`来设置wfuzz等待服务器响应接连的秒数。
参数`--req-delay`来设置wfuzz等待响应完成的最大秒数。

### 结合BurpSuite

从Burp的LOG文件中获取测试的URL地址：

![0x15](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x15.png)

```shell
wfuzz -z burplog,"1.burp" FUZZ
```

![0x16](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x16.png)

还有能够读取burpsuite保存的state：

```shell
wfuzz -z burpstate,a_burp_state.burp FUZZ
```

### 过滤器

这里篇幅太长，建议综合参考 https://github.com/xmendez/wfuzz/blob/18a83606e3011159b4b2e8c0064f95044c3c4af5/docs/user/advanced.rst 就不一一写出来了。
