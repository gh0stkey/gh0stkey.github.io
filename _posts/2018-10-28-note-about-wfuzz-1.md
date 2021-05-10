---
layout: post
author: Vulkey_Chen
title: "Wfuzz初上手"
date: 2018-10-28
music-id: 30814948
permalink: /archives/2018-10-28/1
description: "Wfuzz初上手"
---

# Wfuzz初上手

Author: Vulkey_Chen

Blog: gh0st.cn

## Wfuzz是啥玩意？

wfuzz 是一款Python开发的Web安全模糊测试工具。https://github.com/xmendez/wfuzz

简单粗暴的功能特点记录：

1. 模块化 框架 可编写插件
2. 接口 可处理BurpSuite所抓的请求和响应报文

简而言之就是wfuzz可以用在做**请求参数参数类的模糊测试**，也可以用来做**Web目录扫描**等操作。

## Wfuzz初体验

- 安装Wfuzz `pip install wfuzz`

### 简单的使用

```shell
wfuzz -w 字典 地址(e.g. https://gh0st.cn/FUZZ)
```

如上命令使用-w参数指定字典位置，然后跟上一个要测试的地址，所列的例子`https://gh0st.cn/FUZZ`中有一个**FUZZ**单词，这个单词可以理解是一个占位符，这样就大概了解了wfuzz的基本运行原理，它会读取字典然后传入占位符进行模糊测试请求。

实际的使用一遍：

```shell
wfuzz -w test_dict.txt https://gh0st.cn/FUZZ
```

返回结果如下：

```shell
********************************************************
* Wfuzz 2.2.11 - The Web Fuzzer                        *
********************************************************

Target: https://gh0st.cn/FUZZ
Total requests: 6

==================================================================
ID	Response   Lines      Word         Chars          Payload
==================================================================

000004:  C=404      1 L	     121 W	   1636 Ch	  "test123"
000003:  C=404      1 L	     121 W	   1636 Ch	  "456"
000006:  C=404      1 L	     121 W	   1636 Ch	  "admin123"
000005:  C=404      1 L	     121 W	   1636 Ch	  "admin"
000001:  C=404      1 L	     121 W	   1636 Ch	  "abc"
000002:  C=404      1 L	     121 W	   1636 Ch	  "123"

Total time: 2.122055
Processed Requests: 6
Filtered Requests: 0
Requests/sec.: 2.827447
```

通过返回结果我们可以知道很多信息，最需要关注的就是`ID、Response、 Lines、Word、Chars、Payload`这一行，从左往右看，依次是**编号、响应状态码、响应报文行数、响应报文字数、响应报文正字符数、测试使用的Payload**。

### 了解Wfuzz

通过`-h`或者`--help`可以来获取帮助信息。

#### Wfuzz模块

如上所述说到wfuzz是模块化的框架，wfuzz默认自带很多模块，模块分为5种类型分别是：`payloads`、`encoders`、`iterators`、`printers`和`scripts`。

通过`-e`参数可以查看指定模块类型中的模块列表：

```shell
wfuzz -e payloads
```

`payloads`类的模块列表如下：

```shell
Available payloads:

  Name            | Summary
------------------------------------------------------------------------------------------------------
  guitab          | This payload reads requests from a tab in the GUI
  dirwalk         | Returns filename's recursively from a local directory.
  file            | Returns each word from a file.
  burpstate       | Returns fuzz results from a Burp state.
  wfuzzp          | Returns fuzz results' URL from a previous stored wfuzz session.
  ipnet           | Returns list of IP addresses of a network.
  bing            | Returns URL results of a given bing API search (needs api key).
  stdin           | Returns each item read from stdin.
  list            | Returns each element of the given word list separated by -.
  hexrand         | Returns random hex numbers from the given range.
  range           | Returns each number of the given range.
  names           | Returns possible usernames by mixing the given words, separated by -, using know
                  | n typical constructions.
  hexrange        | Returns each hex number of the given hex range.
  permutation     | Returns permutations of the given charset and length.
  buffer_overflow | Returns a string using the following pattern A * given number.
  iprange         | Returns list of IP addresses of a given IP range.
  burplog         | Returns fuzz results from a Burp log.
  autorize        | Returns fuzz results' from autororize.
```

### Wfuzz使用

从上文知道了wfuzz基于一个非常简单的概念：使用payload来替换相应的FUZZ关键词的位置，FUZZ这样的关键词就是`占位符`，payload就是输入源。

通过`wfuzz -e payloads`可以获取payloads类的所有模块列表，使用`wfuzz -z help`可以获取关于payloads类模块的详细信息，也可以通过`--slice`参数来过滤返回信息的结果。

e.g. `wfuzz -z help --slice "names"`

```shell
Name: names 0.1
Categories: default
Summary: Returns possible usernames by mixing the given words, separated by -, using known typical constructions.
Author: Christian Martorella,Adapted to newer versions Xavi Mendez (@xmendez)
Description:
   ie. jon-smith
Parameters:
   + name: Name and surname in the form of name-surname.
```

#### 使用（字典）

注：命令中的wordlist表示为字典位置

1. `wfuzz -z file --zP fn=wordlist URL/FUZZ`

2. `wfuzz -z file,wordlist URL/FUZZ`

3. `wfuzz -w wordlist URL/FUZZ`

这里有必要说明下，使用命令意义是一样的，都是使用`payloads`模块类中的`file`模块，通过`wfuzz -z help --slice "file"`看如何使用`file`模块：

```shell
Name: file 0.1
Categories: default
Summary: Returns each word from a file.
Author: Carlos del Ojo,Christian Martorella,Adapted to newer versions Xavi Mendez (@xmendez)
Description:
   Returns the contents of a dictionary file line by line.
Parameters:
   + fn: Filename of a valid dictionary
```

通过返回的帮助信息，我们知道这个模块需要一个**参数fn**，这个参数值为字典文件名（绝对路径）。这样子第一条命令一下子就明白了，`wfuzz -z file --zP fn=wordlist URL/FUZZ`中的`-z file`使用模块，`--zP fn=wordlist`是定义**fn参数**的值（可以这样理解，--zP 这里的P大写代表 Parameters ，然后其他的都是固有个事）

第二条命令简写了第一条命令的赋值，第三条命令使用`-w`，这个参数就是`-z file --zP fn`的别名。

**多个字典**

使用`-z` 或`-w` 参数可以同时指定多个字典，这时相应的占位符应设置为 **FUZZ,FUZ2Z,FUZ3Z,....,FUZnZ**, 其中`n`代表了占位序号。

例如想要同时爆破目录、文件名、后缀，可以这样来玩：

`wfuzz -w 目录字典路径 -w 文件名字典路径 -w 后缀名字典路径 URL/FUZZ/FUZ2Z.FUZ3Z`

#### 过滤器

wfuzz具有过滤器功能，在做测试的过程中会因为环境的问题需要进行过滤，例如在做目录扫描的时候，你事先探测并知道了这个网站访问不存在目录的时候使用的是自定义404页面（也就是状态码为200），而你可以选择提取该自定义页面的特征来过滤这些返回结果。

wfuzz过滤分为两种方法：**隐藏符合过滤条件的结果** 和 **显示符合过滤条件的结果**

**隐藏响应结果**

通过`--hc`，`--hl`，`--hw`，`--hh`参数可以隐藏某些HTTP响应。

- `--hc` 根据响应报文状态码进行隐藏（hide code）

隐藏404：

`wfuzz -w wordlist --hc 404 URL/FUZZ`

隐藏404、403：

`wfuzz -w wordlist --hc 404,403 URL/FUZZ`

e.g. 使用百度举个例子，运行`wfuzz -w test_dict.txt https://www.baidu.com/FUZZ`结果如下

![0x00](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x00.png)

这里所有的测试请求，都是不存在的页面，那么百度的404页面规则就是如上图结果所示：**响应报文状态码（302）、响应报文行数（7）、响应报文字数（18）、响应报文字符数（222）**，那么下面的就是填空题了～

- `--hl`根据响应报文行数进行隐藏（hide lines）

`wfuzz -w wordlist --hl 7 https://www.baidu.com/FUZZ`

- `--hw`根据响应报文字数进行隐藏（hide word）

`wfuzz -w wordlist --hw 18 https://www.baidu.com/FUZZ`

- `--hh`根据响应报文字符数进行隐藏（hide chars 这里因为code和chars首字母都是c，--hc参数已经有了，所以hide chars的参数就变成了--hh）

`wfuzz -w wordlist --hh 222 https://www.baidu.com/FUZZ`

如果根据单个条件判断相对来说肯定是不精确的，所以整合一下就是这样的命令：

```shell
wfuzz -w wordlist --hc 302 --hl 7 --hw 18 --hh 222 https://www.baidu.com/FUZZ
```

这样就可以对`https://www.baidu.com/`进行目录扫描咯～



**显示响应结果**

显示响应结果的使用方法跟隐藏时的原理一样，只不过参数变为了：`--sc`（show code），`--sl`（show lines），`--sw`（show word），`--sh` （show chars）。

**使用Baseline(基准线)**

过滤器可以是某个HTTP响应的引用，这样的引用我们称为Baseline。

之前的使用`--hh`进行过滤的例子中，还可以使用下面的命令代替：

```shell
wfuzz -w wordlist --hh BBB https://www.baidu.com/FUZZ{404there}
```

![0x01](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x01.png)

这条命令的意思应该很容易理解，首先要清楚基准线是什么？换个名字：标准线 or 及格线。

首先解释下`https://www.baidu.com/FUZZ{404there}`的意思，这里代表wfuzz第一个请求是请求`https://www.baidu.com/404there`这个网址，在`{ }`内的值用来指定wfuzz第一个请求中的FUZZ占位符，而这第一个请求被标记为BBB（**BBB不能换成别的**）基准线；其次这里使用的参数是`--hh`，**也就是以BBB这条请求中的Chars为基准，其他请求的Chars值与BBB相同则隐藏**。



**使用正则表达式过滤**

wfuzz参数`--ss`和`--hs`可以使用正则表达式来对返回的结果过滤。

e.g. 在这里一个网站自定义返回页面的内容中包含`Not Found`，想根据这个内容进行过滤可以使用如下的命令：

```shell
wfuzz -w wordlist --hs "Not Found" http://127.0.0.1/FUZZ
```

![0x02](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-10-28/0x02.png)

得出结论使用方法：

```
wfuzz -w wordlist --hs 正则表达式 URL/FUZZ #隐藏
wfuzz -w wordlist --ss 正则表达式 URL/FUZZ #显示
```

## 手册

原文来自：DigApis安全 m0nst3r

### 模块种类

#### payload

payload为wfuzz生成的用于测试的特定字符串，一般情况下，会替代被测试URL中的FUZZ占位符。
当前版本中的wfuzz中可用payloads列表如下：

```shell
Available payloads:
  Name            | Summary                                                                           
------------------------------------------------------------------------------------------------------
  guitab          | 从可视化的标签栏中读取请求                                
  dirwalk         | 递归获得本地某个文件夹中的文件名                            
  file            | 获取一个文件当中的每个词                                                    
  autorize        | 获取autorize的测试结果Returns fuzz results' from autororize.                                            
  wfuzzp          | 从之前保存的wfuzz会话中获取测试结果的URL                   
  ipnet           | 获得一个指定网络的IP地址列表                                        
  bing            | 获得一个使用bing API搜索的URL列表 (需要 api key).                   
  stdin           | 获得从标准输入中的条目                                                
  list            | 获得一个列表中的每一个元素，列表用以 - 符号分格                       
  hexrand         | 从一个指定的范围中随机获取一个hex值                                  
  range           | 获得指定范围内的每一个数值                                          
  names           | 从一个以 - 分隔的列表中，获取以组合方式生成的所有usernames值
  burplog         | 从BurpSuite的记录中获得测试结果                                             
  permutation     | 获得一个在指定charset和length时的字符组合                             
  buffer_overflow | 获得一个包含指定个数个A的字符串.                    
  hexrange        | 获得指定范围内的每一个hex值                                   
  iprange         | 获得指定IP范围内的IP地址列表                                 
  burpstate       | 从BurpSuite的状态下获得测试结果
```

#### encoder

encoder的作用是将payload进行编码或加密。
wfuzz的encoder列表如下：

```shell
Available encoders:
  Category      | Name                      | Summary                                                                           
------------------------------------------------------------------------------------------------------------------------
  url_safe, url | urlencode                 | 用`%xx`的方式替换特殊字符， 字母/数字/下划线/半角点/减号不替换
  url_safe, url | double urlencode             | 用`%25xx`的方式替换特殊字符， 字母/数字/下划线/半角点/减号不替换
  url              | uri_double_hex            | 用`%25xx`的方式将所有字符进行编码
  html          | html_escape                | 将`&`，`<`，`>`转换为HTML安全的字符
  html            | html_hexadecimal             | 用 `&#xx;` 的方式替换所有字符
  hashes         | base64                    | 将给定的字符串中的所有字符进行base64编码
  url             | doble_nibble_hex             | 将所有字符以`%%dd%dd`格式进行编码
  db             | mssql_char                | 将所有字符转换为MsSQL语法的`char(xx)`形式
  url             | utf8                        | 将所有字符以`\u00xx` 格式进行编码
  hashes         | md5                         | 将给定的字符串进行md5加密
  default         | random_upper                | 将字符串中随机字符变为大写
  url             | first_nibble_hex          | 将所有字符以`%%dd?` 格式进行编码
  default         | hexlify                    | 每个数据的单个比特转换为两个比特表示的hex表示
  url             | second_nibble_hex         | 将所有字符以`%?%dd` 格式进行编码
  url             | uri_hex                     | 将所有字符以`%xx` 格式进行编码
  default         | none                         | 不进行任何编码
  hashes         | sha1                        | 将字符串进行sha1加密
  url             | utf8_binary                | 将字符串中的所有字符以 `\uxx` 形式进行编码
  url             | uri_triple_hex             | 将所有字符以`%25%xx%xx` 格式进行编码
  url             | uri_unicode                | 将所有字符以`%u00xx` 格式进行编码
  html             | html_decimal                | 将所有字符以 `&#dd; ` 格式进行编码
  db             | oracle_char                | 将所有字符转换为Oracle语法的`chr(xx)`形式
  db             | mysql_char                 | 将所有字符转换为MySQL语法的`char(xx)`形式
```

#### iterator

wfuzz的iterator提供了针对多个payload的处理方式。
itorators的列表如下：

```shell
Available iterators:

  Name    | Summary
----------------------------------------------------------------------------------------------
  product | Returns an iterator cartesian product of input iterables.
  zip     | Returns an iterator that aggregates elements from each of the iterables.
  chain   | Returns an iterator returns elements from the first iterable until it is exhaust
          | ed, then proceeds to the next iterable, until all of the iterables are exhausted
          | .
```


#### printer

wfuzz的printers用于控制输出打印。
printers列表如下：

```shell
Available printers:
  Name      | Summary                             
--------------------------------------------------
  raw       | `Raw` output format
  json      | Results in `json` format
  csv       | `CSV` printer ftw
  magictree | Prints results in `magictree` format
  html      | Prints results in `html` format
```

#### scripts

scripts列表如下：

```shell
Available scripts:
  Category                   | Name          | Summary
----------------------------------------------------------------------------------------------------
  default, passive           | cookies       | 查找新的cookies
  default, passive           | errors        | 查找错误信息
  passive                    | grep          | HTTP response grep
  active                     | screenshot    | 用linux cutycapt tool 进行屏幕抓取 
  default, active, discovery | links         | 解析HTML并查找新的内容
  default, active, discovery | wc_extractor  | 解析subversion的wc.db文件
  default, passive           | listing       | 查找列目录漏洞
  default, passive           | title         | 解析HTML页面的title
  default, active, discovery | robots        | 解析robots.txt文件来查找新内容
  default, passive           | headers       | 查找服务器的返回头
  default, active, discovery | cvs_extractor | 解析 CVS/Entries 文件
  default, active, discovery | svn_extractor | 解析 .svn/entries 文件
  active, discovery          | backups       | 查找已知的备份文件名
  default, active, discovery | sitemap       | 解析 sitemap.xml 文件
```




### 内置工具


#### wfencode 工具

这是wfuzz自带的一个加密/解密（编码/反编码）工具，目前支持内建的encoders的加/解密。

```shell
wfencode -e base64 123456
[RES] MTIzNDU2
wfencode -d base64 MTIzNDU2
[RES] 123456
```

------

#### wfpayload工具

wfpayload是payload生成工具

```shell
wfpayload -z range,0-10
[RES]
0
1
2
3
4
5
6
7
8
9
10
```


#### wxfuzz 工具

这个看源码是一个wxPython化的wfuzz，也就是GUI图形界面的wfuzz。目前需要wxPython最新版本才能使用，但是在ParrotOS和Kali上都无法正常安装成功，问题已在GitHub提交Issue，期待开发者的回复中…




### wfuzz命令中文帮助

```shell
Usage:    wfuzz [options] -z payload,params <url>
    FUZZ, ..., FUZnZ              payload占位符，wfuzz会用指定的payload代替相应的占位符，n代表数字. 
    FUZZ{baseline_value}     FUZZ 会被 baseline_value替换，并将此作为测试过程中第一个请求来测试，可用来作为过滤的一个基础。
Options:
    -h/--help            : 帮助文档
    --help                : 高级帮助文档
    --version            : Wfuzz详细版本信息
    -e <type>            :  显示可用的encoders/payloads/iterators/printers/scripts列表
    --recipe <filename>        : 从文件中读取参数
    --dump-recipe <filename>    : 打印当前的参数并保存成文档
    --oF <filename>               : 将测试结果保存到文件，这些结果可被wfuzz payload 处理
    -c                : 彩色化输出
    -v                : 详细输出
    -f filename,printer         : 将结果以printer的方式保存到filename (默认为raw printer).
    -o printer                  : 输出特定printer的输出结果
    --interact            : (测试功能) 如果启用，所有的按键将会被捕获，这使得你能够与程序交互
    --dry-run            : 打印测试结果，而并不发送HTTP请求
    --prev                : 打印之前的HTTP请求（仅当使用payloads来生成测试结果时使用）
    -p addr                : 使用代理，格式 ip:port:type. 可设置多个代理，type可取的值为SOCKS4,SOCKS5 or HTTP（默认）
    -t N                : 指定连接的并发数，默认为10
    -s N                : 指定请求的间隔时间，默认为0
    -R depth            : 递归路径探测，depth指定最大递归数量
    -L,--follow            : 跟随HTTP重定向
    -Z                : 扫描模式 (连接错误将被忽视).
    --req-delay N            : 设置发送请求允许的最大时间，默认为 90，单位为秒.
    --conn-delay N              : 设置连接等待的最大时间，默认为 90，单位为秒.
    -A                : 是 --script=default -v -c 的简写
    --script=            : 与 --script=default 等价
    --script=<plugins>        : 进行脚本扫描， <plugins> 是一个以逗号分开的插件或插件分类列表
    --script-help=<plugins>        : 显示脚本的帮助
    --script-args n1=v1,...     : 给脚本传递参数. ie. --script-args grep.regex="<A href=\"(.*?)\">"
    -u url                      : 指定请求的URL
    -m iterator            : 指定一个处理payloads的迭代器 (默认为product)
    -z payload            : 为每一个占位符指定一个payload，格式为 name[,parameter][,encoder].
                      编码可以是一个列表, 如 md5-sha1. 还可以串联起来, 如. md5@sha1.
                      还可使用编码各类名，如 url
                                      使用help作为payload来显示payload的详细帮助信息，还可使用--slice进行过滤
    --zP <params>            : 给指定的payload设置参数。必须跟在 -z 或-w 参数后面
    --slice <filter>        : 以指定的表达式过滤payload的信息，必须跟在-z 参数后面
    -w wordlist            : 指定一个wordlist文件，等同于 -z file,wordlist
    -V alltype            : 暴力测试所有GET/POST参数，无需指定占位符
    -X method            : 指定一个发送请求的HTTP方法，如HEAD或FUZZ
    -b cookie            : 指定请求的cookie参数，可指定多个cookie
    -d postdata             : 设置用于测试的POST data (ex: "id=FUZZ&catalogue=1")
    -H header              : 设置用于测试请求的HEADER (ex:"Cookie:id=1312321&user=FUZZ"). 可指定多个HEADER.
    --basic/ntlm/digest auth    : 格式为 "user:pass" or "FUZZ:FUZZ" or "domain\FUZ2Z:FUZZ"
    --hc/hl/hw/hh N[,N]+        : 以指定的返回码/行数/字数/字符数作为判断条件隐藏返回结果 (用 BBB 来接收 baseline)
    --sc/sl/sw/sh N[,N]+        : 以指定的返回码/行数/字数/字符数作为判断条件显示返回结果 (用 BBB 来接收 baseline)
    --ss/hs regex            : 显示或隐藏返回结果中符合指定正则表达式的返回结果
    --filter <filter>        : 显示或隐藏符合指定filter表达式的返回结果 (用 BBB 来接收 baseline)
    --prefilter <filter>        : 用指定的filter表达式在测试之前过滤某些测试条目
```
