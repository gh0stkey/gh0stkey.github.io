---
layout: post
author: Vulkey_Chen
title: "一探短文件名"
date: 2018-11-14
music-id: 1299097118
permalink: /archives/2018-11-14/1
description: "一探短文件名"
---

# 短文件名

最近看见一些漏洞利用到了短文件名回想到之前发现的漏洞，发现自己对短文件名的原理一无所知，现在来一探究竟。

## 什么是短文件名

>windows下的文件短名是dos+fat12/fat16时代的产物，又称为8dot3命名法，类似于PROGRA~1（目录）或者元素周~1.exe（文件）这样的名称。
>8是指文件名或目录名的主体部分小于等于8个字符 ;  3是指文件名或目录名的扩展部分小于等于3个字符 ;中间以 `.` 作为分割在FAT16文件系统中，由于FDT中的文件目录登记项只为文件名保留了8个字节，为扩展名保留了3个字节，所以DOS和Windows的用户为文件起名字时要受到8.3格式的限制。

查看Windows下的短文件名：

![windows](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-14/0.png)

可以看见图中的`123123~1.TXT`，就是`1231231231231231232.txt`的短文件名表示。

**为什么现在Windows系统还存在短文件名这种表示？**

> 从win95开始，采用fat32已经支持长文件名，但是为了保持兼容性，保证低版本的程序能正确读取长文件名文件，每当创建新文件或新目录时，系统自动为所有长文件名文件创建了一个对应的短文件名。使这个文件既可以用长文件名寻址，也可以用短文件名寻址。

## 短文件名命名方式

知道了什么是短文件名，再看如上文所贴图，图中文件`1231231231231231232.txt`的短文件名就是`123123~1.TXT`

**Windows短文件名8dot3命名规则**：

- 符合DOS短文件名规则的Windows下的长文件名不变
- 长文件名中的空格，在短文件名中被删除
- 删除空格后的长文件名，若长度大于8个字符，则取前6个字符，后两个字符以`~#`代替，其中 **#** 为数字，数字根据前六个字符相同的文件名的个数顺延。若个数超过10个则取前5个字符，后三个字符以`~##`代替，其中 **##** 为两位数字，若个数大于100也依此规则替换。
- 对使用多个`.`隔开的长文件名，取最左端一段转换为短文件名，取最右一段前三个字符为扩展名
- 如果存在老 OS 或程序无法读取的字符，用`_`替换

![windows](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-11-14/1.png)



## 关闭短文件名

将Windows注册表（`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`）中的`NtfsDisable8dot3NameCreation`这一项的值设为 1

CMD实现关闭短文件名：

```cmd
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem" /v NtfsDisable8dot3NameCreation /d 1 /t REG_DWORD /f
```

如果想开启（将值设为0）：

```cmd
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem" /v NtfsDisable8dot3NameCreation /d 0 /t REG_DWORD /f
```

**需要注意**：即使关闭了短文件名功能，也不会删除原有创建过的短文件名
