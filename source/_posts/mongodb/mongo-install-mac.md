---
title: Mongodb Mac安装
date: 2018/01/06
type: mongodb
categories:
- Mongodb
tags:
- mongodb
- mongo
- Mongodb
- Mongo
- mac
- Mac
---

######Mongodb Mac安装主要采Homebrew,然后通过Homebrew 安装mongodb，然后创建数据写入目录data/db，给添加权限给data，最后启动mongod

## Homebrew安装
### 执行以下命令，等待安装完毕
``` bash
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```
具体其他使用方法可去官网查看

### 如果已经安装Homebrew下面提供一些常用命令
##### 1.更新brew本身
``` bash
brew update
```
##### 2.安装软件
``` bash
brew install 软件标志
```
##### 3.卸载软件
``` bash
brew uninstall 软件标志名
```
##### 4.显示使用brew安装软件列表
``` bash
brew list
```
##### 5.更新软件
``` bash
brew upgrade 软件标志名（不写则默认所有使用brew安装的软件
```  
##### 6.查看需要升级软件
``` bash
brew outdated
```
##### 7.查找需要软件
``` bash
brew search
```
##### 8.查看brew安装的软件，所在位置
``` bash
brew --cache
```

## mongodb安装
### 执行以下命令
``` bash
brew install mongodb
```
### 安装成功后再启动前创建数据写入目录
##### 1.切换根目录
``` bash
cd /
```
##### 2.创建数据写入目录 参数-p作用需要时创建上层目录，如果存在忽略创建子目录,如创建失败可能涉及权限问题加sudo
``` bash
mkdir -p data/db
```
### 给数据写入目录添加可读可写权限
##### 1.切换根目录
``` bash
cd /
```
##### 2.添加权限 -R参数表示递归
``` bash
sudo chown -R 用户名 data/db
```
### 启动mongodb
##### 1.启动mongodb server
``` bash
mongod
```
##### 2.连接数据库,做数据库操作
``` bash
mongo
```
