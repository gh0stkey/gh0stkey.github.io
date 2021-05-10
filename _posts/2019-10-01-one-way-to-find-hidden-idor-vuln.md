---
layout: post
author: Vulkey_Chen
title: "One Way to Find Hidden IDOR Vulnerability"
date: 2019-10-01
music-id: 
permalink: /archives/2019-10-01/1
description: "One Way to Find Hidden IDOR Vulnerability"
---

# One Way to Find Hidden IDOR Vulnerability

I received an invitation for an internal project, i found an interesting vulnerability in this project.

After submitting some regularized vulnerabilities, the project seems to have no one to submit new security issues.



I started to try some **WebFuzz** techniques.

First i should test for sensitive information api, because vulnerabilities here are the most valuable( many bounty :D ).



I found one API about sensitive information -> `../getUserAuth...`

![api](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/idor/0.png)

**HTTP Message Body** as follows

```json
{"responseData":{"userid":"user_id","login":"user_name","password":"user_password","mobilenum":"user_mobilephone_number","mobileisbound":"01","email":"user_email_address"}}
```

It looks really **exciting** !!! If I can get this information about other people based on my account, i think this is great !!!

Here is my test step ↓↓

## Step 1

I see this is a GET request without any request parameters, so i need add parameters.

But where can i get parameters ???

At first i thought of using a dictionary to guess, but i didn’t get the results i wanted after trying.

## Step 2

I tried to convert **HTTP Response Body** to **HTTP Request Parameters**.

So, i get these parameters (*BurpSuite Plugin*: <https://github.com/gh0stkey/JSONandHTTPP>):

![json2httpp](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/idor/1.png)

```http
mobileisbound=01
login=user_name
userid=user_id
password=user_password
mobilenum=user_mobilephone_number
email=user_email_address

../getUserAuth...?login=[Test Account B]user_name
../getUserAuth...?userid=[Test Account B]user_id
... and so on
```

But after trying, i also can't get the results i want.

## Step 3

I found the naming rules for other API parameters when I was about to give up.

Rule -> `English capitalization`

Change the parameter to uppercase with javascript:

![uppercase](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/idor/2.png)

God is taking care of people who are careful～I tried to add parameters and i found interesting results.

![result](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/idor/3.png)

I successfully **get the sensitive information** of the `account B` based on the credentials of the `account A` !!!

## END

1. I reported the vulnerability.
2. Officially confirmed that this is a critical vulnerability.
3. Waited for 3 days... I was awarded ¥3,000 (RMB) bounty.
