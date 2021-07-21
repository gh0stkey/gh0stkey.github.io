---
layout: post
author: Vulkey_Chen
title: "TRICK: Linux Auditd审计工具"
date: 2019-08-20
music-id: 
permalink: /archives/2019-08-20/1
description: "TRICK: Linux Auditd审计工具"
---

## 背景

难题：/home/chen/test/目录下的index.html为首页文件，一直被入侵者恶意篡改

需求：想要定位攻击方式以及篡改方式

命令：`auditctl` （安装：`sudo apt install auditd`）

参数：

```
-w 监控文件路径
-p 监控文件筛选 r(读) w(写) x(执行) a(属性改变)
-k 关键词（用于查询监控日志）
```

运行：`sudo auditctl -w /home/chen/test/index.html -p w -k index`，等待二次篡改

## 过程

发现被篡改执行：`sudo ausearch -i -k index` 查看日志

```
type=SYSCALL msg=audit(08/20/2019 02:22:10.905:509) : arch=x86_64 syscall=rename success=yes exit=0 a0=0x7f5c94011370 a1=0x7f5c94005d90 a2=0x0 a3=0x20 items=5 ppid=1966 pid=17243 auid=chen uid=chen gid=chen euid=chen suid=chen fsuid=chen egid=chen sgid=chen fsgid=chen tty=(none) ses=3 comm=pool exe=/usr/bin/gedit key=index 
```

了解该日志的格式：

```
syscall : 相关的系统调用
auid : 审计用户ID
uid 和 gid : 访问文件的用户ID和用户组ID
comm : 用户访问文件的命令
exe : 上面命令的可执行文件路径
```

这里的`syscall`可以理解为是执行的动作，那么这段日志就非常容易理解了：用户chen使用**gedit** rename了该文件（重命名）

那么`syscall`是什么代表着编辑文件内容呢？（篡改）

测试`gedit`打开文件、编辑文件内容、保存文件，有三条日志：

```
type=SYSCALL msg=audit(08/20/2019 02:22:10.897:506) : arch=x86_64 syscall=openat success=no exit=EEXIST(File exists) a0=0xffffff9c a1=0x7f5ca0009800 a2=O_WRONLY|O_CREAT|O_EXCL a3=0x1b6 items=2 ppid=1966 pid=17243 auid=chen uid=chen gid=chen euid=chen suid=chen fsuid=chen egid=chen sgid=chen fsgid=chen tty=(none) ses=3 comm=pool exe=/usr/bin/gedit key=index 
type=SYSCALL msg=audit(08/20/2019 02:22:10.897:507) : arch=x86_64 syscall=openat success=yes exit=17 a0=0xffffff9c a1=0x7f5ca0009800 a2=O_WRONLY|O_CREAT|O_NOFOLLOW a3=0x1b6 items=2 ppid=1966 pid=17243 auid=chen uid=chen gid=chen euid=chen suid=chen fsuid=chen egid=chen sgid=chen fsgid=chen tty=(none) ses=3 comm=pool exe=/usr/bin/gedit key=index 
type=SYSCALL msg=audit(08/20/2019 02:22:10.905:509) : arch=x86_64 syscall=rename success=yes exit=0 a0=0x7f5c94011370 a1=0x7f5c94005d90 a2=0x0 a3=0x20 items=5 ppid=1966 pid=17243 auid=chen uid=chen gid=chen euid=chen suid=chen fsuid=chen egid=chen sgid=chen fsgid=chen tty=(none) ses=3 comm=pool exe=/usr/bin/gedit key=index 
```

syscall分别为：`openat`、`openat`、`rename`，但注意到第一个`openat`的日志中的`success等于no`

也就是说我们可以理解日志中出现`syscall=openat`即有人在修改文件，那么查看日志的命令就可以变成：

`sudo ausearch -i -k index | grep 'syscall=openat'`

**END**：定位到了用户、进程就可以继续跟踪了。
