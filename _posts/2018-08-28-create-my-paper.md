---
layout: post
author: Vulkey_Chen
title: "Jekyll文章创建程序(C语言)"
date: 2018-08-28
permalink: /archives/2018-08-28/2
description: "Jekyll文章创建程序(C语言)"
---

感谢倾璇、晏子霜师傅的教导，学习C语言的道路上，个人的第一个C语言小程序诞生了...

希望自己接下来的学习可以戒骄戒躁！

代码如下：

```c
#include <stdio.h>
#include <time.h>
#include <string.h>

char t[50];

//文章结构体初始化
struct initArticle{
	char title[100];
	char author[50];
	char dtime[15];
	char permalink[30];
	char description[200];
};

typedef struct initArticle Paper;

int getTime(){ //获取时间
	time_t rawtime;
	struct tm *info;
	int year, month, day;
	time(&rawtime);
	info = localtime(&rawtime);
	year = 1900+(info->tm_year);
	month = info->tm_mon+1;
	day = info->tm_mday;
	
	//时间格式 赋值给全局变量t
	if(day<10 && month<10){
		sprintf(t, "%d-0%d-0%d", year, month, day);
	}else if(day<10){
		sprintf(t, "%d-%d-0%d", year, month, day);
	}else if(month<10){
		sprintf(t, "%d-0%d-%d", year, month, day);
	}else{
		sprintf(t, "%d-%d-%d", year, month, day);
	}
	
	return 0;
}

//主函数
int main(int argc, char *argv[]){
	getTime();//获取时间
	Paper p;
	argv[1][51] = '\0';
	argv[2][5] = '\0';
	char *dt[50];
	*dt = t;

	char plink[30];
	sprintf(plink, "/archives/%s/%s", t, argv[2]);

	strcpy(p.dtime, *dt);
	strcpy(p.permalink, plink);
	strcpy(p.author, "Vulkey_Chen");

	printf("Title: ");
	scanf("%100s", p.title);

	printf("Description: ");
	scanf("%200s", p.description);

	FILE *fp = NULL;
	strcat(t, "-");
	strcat(t, argv[1]);
	strcat(t, ".md");
	//printf("%s %s", *dt, plink);
	fp = fopen(t, "w");
	fprintf(fp, "---\nlayout: post\nauthor: %s\ntitle: \"%s\"\ndate: %s\nmusic-id: \npermalink: %s\ndescription: \"%s\"\n---", p.author, p.title, p.dtime, p.permalink, p.description);
	fclose(fp);
	printf("File: [%s], create successfully!\n", t);
}
```

运行：

![run](https://chen-blog-oss.oss-cn-beijing.aliyuncs.com/2018-08-28/a.png)
