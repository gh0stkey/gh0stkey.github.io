---
layout: post
author: Vulkey_Chen
title: "安装Aquatone工具记录"
date: 2018-09-02
music-id: 
permalink: /archives/2018-09-02/1
description: "安装Aquatone工具记录"
---

> Aquatone是一款子域名挖掘工具，Aquatone不仅仅只是通过简单的子域爆破，它还会利用各种开放的互联网服务和资源，来协助其完成子域枚举任务，这也大大提高了子域的爆破率。当发现子域时，我们还可以使用Aauatone来探测主机的公共HTTP端口，并收集响应头，HTML和屏幕截图，并能最终为我们生成一个报告，便于我们后续的分析利用。

# 安装

系统: Ubuntu 18.04

## 安装Nodejs(包含npm)：

```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 安装Aquatone

```bash
sudo gem install aquatone
```

### 安装nightmare

electron是nightmare的依赖环境，安装完electron后便开始安装nightmare

- 安装electron

```bash
cd /var/lib/gems/2.5.0/gems/aquatone-0.5.0
sudo npm install electron
```

- 安装nightmare

```bash
cd /var/lib/gems/2.5.0/gems/aquatone-0.5.0
sudo npm install --save nightmare --unsafe-perm=true --allow-root
```

**如果不按照我步骤来可能会出现这样的错误：**

```bash
Incompatability Error: Nightmarejs must be run on a system with a graphical desktop session (X11)
```



# 致谢

![use](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-09-02%2F0x00.png)

感谢https://github.com/michenriksen/aquatone/issues/97中的**ojaschauhan44**
