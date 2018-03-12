---
title: Express实用技巧和设计模式
date: 2018/03/12
categories:
- nodejs
tags:
- node
- express
- router
- ejs
- static
- use
---
## Express实用技巧和设计模式

### 1.Express介绍

> Express是一个简介、灵活的node.js web应用开发框架，是目前最流行的基于node.js的web开发框架，提供了一系列强大的功能，比如：
>
> - 路由控制
> - 中间件
> - 静态文件服务
> - 模板解析
>
> 本文主要介绍这些功能的使用和它的设计理念

### 2.Express如何使用

本地安装

``` install
$ npm install express
```

获取、引用通过变量app（app其实在内部是application返回的一个handle函数，所有express的方法都在app上的原型方法） 我们可以调用express的方法

```express function
var express = require('express)
var app = express()
app.liten(3000)
```

### 3.路由控制

express通过匹配请求路径，在做request、response操作，具体看下面get、post方法

- Express的get方法

  第一个参数path为请求路径，第二个参数为处理请求的回调函数

  ``` get
  app.get(path, function(req, res))
  ```

  get方法使用

  ```get
  const express = require('express');
  const app = express();
  //匹配htp://localhost:3000/hello做相关req，res的操作
  app.get('/hello',function(req,res){
      res.end('hello');
  });
  //匹配htp://localhost:3000/world做相关req，res的操作
  app.get('/world',function(req,res){
      res.end('world');
  });
  //匹配所有，主要用作not found
  app.get('*',function(req,res){
      res.setHeader('Content-Type','text/plain;charset=utf8');
      res.end('Not Found');
  });
  app.listen(3000);
  ```

- Express的post方法

  第一个参数path为请求路径，第二个参数为处理请求的回调函数和get一样

  ```post
  app.post(path,function(req,res))
  ```

  post方法使用

  ```post
  var express = require('./express');
  var app = express();
  //匹配htp://localhost:3000/hello做相关req，res的操作
  app.post('/hello', function (req,res) {
     res.end('hello');
  });
  //匹配所有，主要用作not found
  app.post('*', function (req,res) {
      res.end('post没找到');
  });
  app.listen(3000);
  ```

  通过linux命令发送post请求

  ```curl
  $ curl -X POST http://localhost:3000/hello
  ```

- Express的all方法

  监听所有的请求方法，可以匹配所有的HTTP动词。根据请求路径来处理客户端发出的所有请求，参数同上

  ```all
  app.all(path,function(req, res))
  ```

  all方法使用

  ```all
  const express = require('express');
  const app = express();
  app.all('/world',function(req,res){
      res.end('all world');
  });
  app.listen(3000);
  ```

- Express Router的设计理念

  先看如下代码

  ``` example
  const express = require('express');
  const app = express();
  app.get('/user',function(req,res,next){
      console.log(1);
      next();
  },function(req,res,next){
      console.log(11);
      next();
  }).get('/world',function(req,res,next){
      console.log(2);
      next();
  }).get('/hello',function(req,res,next){
      console.log(3);
      res.end('ok');
  });
  app.listen(3000);
  ```

  > 如上代码，体现出express router的一个概念，就是二维数组的二维数据形式，这个概念的主要意义是：在router路由容器中存放一层层route实例，并且每层route实例中存放一层层callback，当匹配上一个route的时候，执行它里面的callback

  如下图所示

  ![express-router](express-router/express-router.png)

  > 再router和route中分别用stack存储，不同的是Router中的stack存放的是Route，并且根据相同路由匹配，遍历Stack中相关Route，其中handle方法是挂载到layer上面的Route，并且触发Route从而遍历Route中的Stack，在Route中的Stack存放的是一层层的callback，所以最终调用所有callback在同一个匹配路径上，其中核心原理就是这个二维数组的二维数据形式

### 4.中间件

中间件就是处理HTTP请求的函数，用来完成各种特定的任务，比如检查用户是否登录、检测用户是否有权限访问等，它的特点是：

- 一个中间件处理完请求和响应可以把相应数据再传递给下一个中间件
- 回调函数的next参数,表示接受其他中间件的调用，函数体中的next(),表示将请求数据继续传递
- 可以根据路径来区分返回执行不同的中间件

- #### 1.中间件的使用

  > 主要通过use方法

  ```use
  var express = require('express');
  var app = express();
  app.use(function (req,res,next) {
      console.log('全部匹配');
      next();
  });
  app.use('/water', function (req,res,next) {
      console.log('只匹配/water');
      next();
  });
  app.get('/water', function (req,res) {
      res.end('water');
  });
  app.listen(3000);
  ```

  #### 2.中间件原理

  > 通过Application原型上的use方法，将Router变函数，抽象出Router方法复用，Router处理中间件，其实就是上面所讲述的路由控制原理，看如下代码，可以用app下面的use方法调取中间件，也可以创建一个express.router，在通过app下面use调用这个中间件，形成一个父子级别的中间件路由，下面user.use就是当访问/user/或者/user/2的子路由

  ```express use
  const express = require('../');
  const app = express();
  app.use(function(req,res,next){
      console.log('Ware1:',Date.now());
      next('wrong');
  });
  app.get('/',function(req,res,next){
      res.end('1');
  });
  const user = express.Router();
  user.use(function(req,res,next){
      console.log('Ware2',Date.now());
      next();
  });
  user.use('/2',function(req,res,next){
      res.end('2');
  });
  app.use('/user',user);
  app.use(function(err,req,res,next){
      res.end('catch '+err);
  });
  app.listen(3000,function(){
      console.log('server started at port 3000');
  });
  ```

  #### 3.中间件设计模式

  > 主要思想就是Application有一个router属性指向了Router函数，在Router中返回一个router函数，将get/handle等方法挂载到返回的router上面，其实express.Router()方法就是Router函数。并且中间件和普通的路由都是在Router的stack中，如图所示

  ![express-use](express-router/express-use.png)

### 5.静态服务文件

如果要在网页中加载静态文件（css、js、img），就需要另外指定一个存放静态文件的目录，当浏览器发出非HTML文件请求时，服务器端就会到这个目录下去寻找相关文件

```static
var express = require('express');
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname,'public')));
app.listen(3000);
```

- #### 静态文件服务器实现

  > static属于express内置中间件，其中原理主要是调用了serve-static库，具体实现是原生node.js API，可以查看我写的一篇如何搭建静态服务器 [static-server](https://github.com/ngaiwe/static-server)

### 6.模板解析

> 这里主要说的是ejs模板，具体API请查阅 [EJS官网](http://www.embeddedjs.com)

- 安装ejs

  ```ejs
  $ npm install ejs
  ```

- 设置模板

  ``` set
  var express = require('express');
  var path = require('path');
  var app = express();
  app.set('view engine','ejs');
  app.set('views',path.join(__dirname,'views'));
  app.listen(3000);
  ```

- 渲染html

  ```engine
  app.set('view engine','html')
  app.set('views',path.join(__dirname,'views'));
  app.engine('html',require('ejs').__express);
  ```

- 渲染视图

  - 第一个参数 要渲染的模板
  - 第二个参数 渲染所需要的数据

  ``` render
  app.get('/', function (req,res) {
      res.render('hello',{title:'hello'},function(err,data){});
  });
  ```

- 模板的实现

  ``` render
  res.render = function (name, data) {
      var viewEngine = engine.viewEngineList[engine.viewType];
      if (viewEngine) {
          viewEngine(path.join(engine.viewsPath, name + '.' + engine.viewType), data, function (err, data) {
              if (err) {
                  res.status(500).sendHeader().send('view engine failure' + err);
              } else {
                  res.status(200).contentType('text/html').sendHeader().send(data);
              }
          });
      } else {
          res.status(500).sendHeader().send('view engine failure');
      }
  }
  ```

### 7.结语

> 本篇文章主要介绍核心功能和核心代码思想，其余的方法如：redirect(重定向)、body-parser(请求体解析)、send方法等等不做介绍，具体请查阅下方给出的相关教程

- [body-parser原理与实现](https://www.cnblogs.com/chyingp/p/nodejs-learning-express-body-parser.html)
- [理解RESTful架构](http://www.ruanyifeng.com/blog/2011/09/restful)
- [cookie-parser](https://www.npmjs.com/package/cookie-parser)

### 8.博客

[魏燃技术博客](http://www.ngaiwe.com)

有任何问题可留言或者发送本人邮箱ngaiwe@126.com





