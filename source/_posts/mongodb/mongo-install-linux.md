---
title: mongodb 云端Linux安装
date: 2018/01/07
categories:
- Mongodb
tags:
- mongodb
- mongo
- Mongodb
- Mongo
- linux
- Linux
---

###### 如何在阿里云服务器Linux环境下安装mongodb，使用mongohub视图工具操作

## 官网下载安装包,选择版本按照服务器版本选择，这里选择Ubuntu16.04版本
https://www.mongodb.com/download-center#community
## 将下载好的压缩包传到服务器上,在mac电脑因为是linux环境 所以用scp传输 Downloads是本机mongodb压缩包地址，Ip后:/代表传输到服务器根目录
``` bash
scp Downloads/mongodb-linux-x86_64-ubuntu1604-3.6.1.tgz 服务器用户名@4服务器IP:/
```
### 进行解压，因为本下载压缩包格式是tgz格式 所以用tar命令解压
``` bash
tar -zxvf mongodb-linux-x86_64-ubuntu1604-3.6.1.tg
```
### 创建文件夹mongodb
``` bash
mkdir mongodb
```
### 将解压好的文件移入mongodb文件夹内
``` bash
mv mongodb
```
### 在mongodb文件夹内创建data文件夹存放db文件 创建logos文件夹存放log文件,并且在logs文件夹内创建mongodb.log文件
``` bash
mkdir data
mkdir logs
cd logs/
touch mongodb.lo
```
### 在mongodb跟目录在创建etc配置文件夹
``` bash
mkdir etc
```
### 在etc中创建配置文件mongo.conf
``` bash
dbpath=/mongodb/data/
logpath=/mongodb/logs/mongodb.log
logappend=true //代表日志追加 不会覆盖
quiet=true //默认是true表示在调试时会过滤日志，如果不想在调试时过滤日志可false
port=27017 //指定端口
```
### 切换目录到mongodb->mongo安装文件夹->bin目录 指定mongo配置指向，并启动mongod
``` bash
mongod -f /mongodb/etc/mongo.conf
```
### 服务器防火墙添加27017端口规则
### 在mac中打开mongohub视图工具，添加数据库，按需求是否设置过集合用户名密码，没有则不填写，选择服务器创建的Database或者为空代表整个mongodb数据库
![](/mongo-install-linux/mongohub.png)
