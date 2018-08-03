---
title: webpack从此不再是我们的痛点 — 核心基础
date: 2018/04/14
categories:
- webpack
tags:
- webpack
---
> webpack一直是前端工程师的痛点，因为他的复杂、分散、loader、plugin这些第三方，让我们的学习成本陡然上升，使我们一直对他的配置模棱两可，今天带大家彻底明白他如何配置，摆脱困扰我们很久的痛点。本篇主要是webpack基础配置详解，关于webpack的模块chunk、编译阶段流程、输出阶段流程、loader的编写和手写plugin会在后续文章推出，为了避免错过可以关注我或者收藏我的个人博客www.ngaiwe.com

### 1.webpack是什么？

WebPack可以看做是模块打包机：它做的事情是，分析你的项目结构，找到JavaScript模块以及其它的一些浏览器不能直接运行的拓展语言（Scss，TypeScript等），并将其打包为合适的格式以供浏览器使用。并且跟具你的在项目中的各种需求，实现自动化处理，解放我们的生产力

- 代码转换：TypeScript 编译成 JavaScript、SCSS 编译成 CSS 。
- 文件优化：压缩 JavaScript、CSS、HTML 代码，压缩合并图片等。
- 代码分割：提取多个页面的公共代码、提取首屏不需要执行部分的代码让其异步加载。
- 模块合并：在采用模块化的项目里会有很多个模块和文件，需要构建功能把模块分类合并成一个文件。
- 自动刷新：监听本地源代码的变化，自动重新构建、刷新浏览器。
- 代码校验：在代码被提交到仓库前需要校验代码是否符合规范，以及单元测试是否通过。
- 自动发布：更新完代码后，自动构建出线上发布代码并传输给发布系统。

### 2.项目初始化

``` webpack init
mkdir webpack-start
cd webpack-start
npm init
```

### 3.webpack核心概念

- Entry：入口，webpack执行构建的第一步将从Entry开始，可抽象理解为输入
- Module：模块，在webpacl中一切皆为模块，一个模块对应一个文件，webpack会从配置的Entry开始递归找出所有依赖的模块
- Chunk：代码块，一个chunk由多个模块组合而成，用于将代码合并和分割
- Loader：模块转换器，用于把模块原内容按照需求转换为需要的新内容
- Plugin：扩展插件，在webpack构建流程中的特定时机注入扩展逻辑来改变构建结果和想要做的事情
- Output：输入结果，在webpack经过一系列处理并得到最终想要的代码然后输出结果

> Webpack 启动后会从 `Entry` 里配置的 `Module` 开始递归解析 Entry 依赖的所有 Module。 每找到一个 Module， 就会根据配置的`Loader`去找出对应的转换规则，对 Module 进行转换后，再解析出当前 Module 依赖的 Module。 这些模块会以 Entry 为单位进行分组，一个 Entry 和其所有依赖的 Module 被分到一个组也就是一个 `Chunk`。最后 Webpack 会把所有 Chunk 转换成文件输出。 在整个流程中 Webpack 会在恰当的时机执行 Plugin 里定义的逻辑。

##### 1.Entry

> context用来解决配置文件和入口文件不再同一层结构，列如我们配置文件在config，入口文件在根目录，则如下配置

```context
module.exports = {
  context: path.join(__dirname, '..'), // 找到根目录
  entry: './main.js' //根目录下的入口文件
}
```



> 最简单的单页面(SPA)Entry入口，将main.js引入，并根据main.js中引用和依赖的模块开始解析

``` entry
module.exports = {
  entry: './main.js'
}
```

> 多页面(MPA)Entry入口，将多个文件引入，当然一般是读取指定文件夹内的入口文件，然后引入

```entry
entry: {
  home: "./home.js",
  about: "./about.js",
  contact: "./contact.js"
}
```

如果是单页面(传入的是字符串或字符串数组)，则chunk会被命名为main，如果是多页面(传入一个对象)，则每个键(key)会是chunk的名称，描述了chunk的入口起点

##### 2.Output

> Object 指示webpack如何去输出，以及在哪里输出你的bundle、asset 和其他你所打包或使用 webpack 载入的任何内容

- path：输出目录对应一个绝对路径

  ``` path
  path: path.resolve(__dirname, 'dist')
  ```

- pathinfo：boolean 默认false作用是告诉webpack在bundle中引入所包含模块信息的相关注释，不应用于生产环境(production)，对开发环境(development)极其有用

- publicPath：主要作用是针对打包后的文件里面的静态文件路径处理

- filename：定义每个输出bundle的名称，这些bundle将写入output.path选项指定的目录下，对于单入口Entry，filename是一个静态名称

  ```filename
  filename: "bundle.js"
  ```

  但是在webpack中我们会用到代码拆分、各种插件plugin或多入口Entry创建多个bundle，这样我们就应该给每个bundle一个唯一的名称

  ```filename
  filename: "[name].bundle.js"
  ```

  使用内部chunk id

  ```filename
  filename: "[id].bundle.js"
  ```

  唯一hash生成

  ```filename
  filename: "[name].[hash].bundle.js"
  ```

  使用基于每个 chunk 内容的 hash

  ```filename
  filename: "[chunkhash].bundle.js"
  ```

##### 3.Module模块

> 处理项目中应用的不同模块，主要配置皆在Rules中，匹配到请求的规则数组，这些规则能够对模块应用loader，或者修改解析器parser

- Module.noParse： 防止webpack解析的时候，将规则匹配成功的文件进行解析和忽略大型的library来对性能的优化，在被忽略的文件中不应该含有import、require和define的调用

  ```noParse
  module.exports = {
    module: {
      rules: [],
      noParse: function(content) {
        return /jquery|lodash/.test(content) // 忽略jquery文件解析，直接编译打包
      }
    }
  }
  ```

- Rules：创建模块时，匹配请求的规则数组

  - Rule条件：resource(请求文件的绝对路径)、issuer(被请求资源的模块文件的绝对路径，导入时的位置)，比如一个文件A导入文件B，resource是/B，issuer是/A是导入文件时的位置，而不是真正的位置，在规则中，test/include/exclude/resource对resource匹配，而issuer只对issuer匹配

  - Test/include/exclude/resource/issuer的用法和区别

    ```rule
    module.exports = {
        modules: {
            rules: [
              {
                test: /\.js?$/,
                include: [
                  path.resolve(__dirname, "app")
                ],
                exclude: [
                  path.resolve(__dirname, "app/demo")
                ],
                resource:{
                  test: /\.js?$/,
                  include: path.resolve(__dirname, "app"),
                  exclude: path.resolve(__dirname, "app/demo")
                },
                issuer: {
                  test: /\.js?$/,
                  include: path.resolve(__dirname, "app"),
                  exclude: path.resolve(__dirname, "app/demo")
                }
              }
            ]
      }
    }
    ```

    text：一般是提供一个正则表达式或正则表达式的数组，绝对路径符合这个正则的则意味着满足这个条件

    include：是一个字符串或者字符串数组，指定目录中的文件需要走这个规则

    exclude：同样是一个字符串或者字符串数组，指定目录中的文件不需要走这个规则

    resource：就是对text/include/exclude的一个对象包装，和他们单独写没有区别

    issuer：和resource有异曲同工的作用，不过区别在于它是将这个rule应用于哪个文件以及这个文件所导入的所有依赖文件

  - resourceQuery：和resource用法一样，不过针对的是匹配结果'?'后面的路径参数，可以调用resource中的text等

  - oneOf：表示对该资源只应用第一个匹配的规则，一般结合resourceQuery

    ``` oneOf
    {
      test: /\.(png|jpe?g|gif|svg)$/,
      oneOf: [
        {
          resourceQuery: /inline/, 
          loader: 'url-loader'
        },
        {
          loader: 'file-loader'
        }
      ]
    }
    ```

    - path/to/foo.png?inline: 会匹配url-loader
    - path/to/foo.png?other:会匹配file-loader
    - path/to/foo.png: 会匹配file-loader

  - useEntry：object包含着每一个loader并且对应loader的配置文件

    ```useEntry
    {
      loader: "css-loader",
      options: {
        modules: true
      }
    }
    ```

    options会传入loader，可以理解为loader的选项

  - use：是对useEntry的集合，并且对每一个入口指定使用一个loader

    ```use
    use: [
      'style-loader',
      {
        loader: 'css-loader',
        options: {
          importLoaders: 1
        }
      },
      {
        loader: 'less-loader',
        options: {
          noIeCompat: true
        }
      }
    ]
    ```

##### 4.Resolve解析

> 主要用来模块如何被解析，给webpack提供默认值

- alias：object主要用来让import和require调用更方便，设置初始路径

  ```alias
  module.exports = {
   alias: {
    Utilities: path.resolve(__dirname, 'src/utilities/'),
    Templates: path.resolve(__dirname, 'src/templates/')
   }   
  }
  // 最开始的import
  import Utility from '../../utilities/utility';
  // 配置完以后
  import Utility from 'Utilities/utility';
  ```

- enforceExtension：Boolean 默认false，表示引用不需要扩展名，为true时，import、require中引用必须加扩展名

- extensions：Array 自动解析不需要扩展名

  ``` extensions
  extensions: [".js", ".json"]  // .js、.json引入不需要扩展名
  ```

- modules：Array webpack解析模块的时候需要搜索的目录，一般用于优先搜索和非node_modules文件中的自定义模块

  ```modules
  modules: [path.resolve(__dirname, "src"), "node_modules"] //优先搜索src目录
  ```

##### 5.Loader

> 通过使用不同的Loader，Webpack可以要把不同的文件都转成JS文件,比如CSS、ES6/7、JSX等，一般用于module的use中

```loader
module: {
  rules:[
      {
        test:/\.css$/,
        use:['style-loader','css-loader'],
        include:path.join(__dirname,'./src'),
        exclude:/node_modules/
      }
  ]      
}
```

具体相关loader需要查看你要引入的loader官方文档API，手写Loader会在下一篇文章具体介绍

##### 6.Plugin插件

> Array 扩展webpack，在webpack构建流程中的特定时机注入扩展逻辑来改变构建结果和想要做的事情，具体使用查看你引入的plugin官方文档，手写plugin会在后续文章中推出

##### 7.webpack-dev-server

> 开发中的server，webpack-dev-server可以快速搭建起本地服务，具体使用查看 [webpack-dev-server](https://www.npmjs.com/package/webpack-dev-server)

##### 8.Devtool

> 此选项控制是否生成，以及如何生成，官方推荐 [SourceMapDevToolPlugin](https://doc.webpack-china.org/plugins/source-map-dev-tool-plugin) 和 [source-map-loader](https://doc.webpack-china.org/loaders/source-map-loader) 建议看官方文档 [Devtool](https://doc.webpack-china.org/configuration/devtool/) 主要用来控制打包品质和在dev环境的调试便捷度和编译的快慢

##### 9.Watch

> webpack 可以监听文件变化，当它们修改后会重新编译和 [HotModuleReplacementPlugin](https://www.npmjs.com/package/webpack-hot-middleware) 有相似之处，监听文件变动热启动

### 4.配置webpack

webpack安装命令

``` webpack
npm install webpack webpack-cli -D
```

Webpack.config.js

> 具体用到的plugin插件

- clean-webpack-plugin：用于打包前清空输出目录 [官方API](https://www.npmjs.com/package/clean-webpack-plugin)
- html-webpack-plugin：用于自动产出HTML和引用产出的资源 [官方API](https://www.npmjs.com/package/html-webpack-plugin)
- copy-webpack-plugin：用于拷贝静态资源，包括未被引用的资源 [官方API](https://www.npmjs.com/package/copy-webpack-plugin)
- uglifyjs-webpack-plugin：用于压缩JS可以让输出的JS文件体积更小、加载更快、流量更省，还有混淆代码的加密功能 [官方API](https://www.npmjs.com/package/uglifyjs-webpack-plugin)
- extract-text-webpack-plugin：因为CSS的下载和JS可以并行,当一个HTML文件很大的时候，我们可以把CSS单独提取出来加载 [官方API](https://www.npmjs.com/package/extract-text-webpack-plugin)

```webpack-server
const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin')
// npm i extract-text-webpack-plugin@next // @next可以安装下一个非正式版本
const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin');
let cssExtract = new ExtractTextWebpackPlugin({
    filename: 'css/css.css',
    allChunks: true
});
let lessExtract = new ExtractTextWebpackPlugin('css/less.css');
let sassExtract = new ExtractTextWebpackPlugin('css/sass.css');
/**
 * 有些时候我们希望把页面中的CSS文件单独拉出来保存加载
 * extract-text-webpack-plugin
 */
//let pages = ['index', 'base'];
// pages = pages.map(page => new HtmlWebpackPlugin({
//     template: './src/index.html',//指定产的HTML模板
//     filename: `${page}.html`,//产出的HTML文件名
//     title: `${page}`,
//     chunks: ['common', `${page}`],//在产出的HTML文件里引入哪些代码块
//     hash: true,// 会在引入的js里加入查询字符串避免缓存,
//     minify: {
//         removeAttributeQuotes: true
//     }
// }));
module.exports = {
    //先找到每个入口(Entry)，然后从各个入口分别出发，找到依赖的模块(Module)，
    //然后生成一个Chunk(代码块),最后会把Chunk写到文件系统中(Assets)   
    entry: './src/main.js',
    output: {
        path: path.join(__dirname, 'dist'),//输出的文件夹，只能是绝对路径 
        //name是entry名字main,hash根据打包后的文件内容计算出来的一个hash值
        filename: '[name].[hash].js' //打包后的文件名
    },
    resolve: {
        //引入模块的时候，可以不用扩展名 
        extensions: [".js", ".less", ".json"],
        alias: {//别名
            "bootstrap": "bootstrap/dist/css/bootstrap.css"
        }
    },
    //表示监控源文件的变化，当源文件发生改变后，则重新打包
    watch: false,
    watchOptions: {
        ignored: /node_modules/,
        poll: 1000,//每秒钟询问的次数
        aggregateTimeout: 500//
    },
    //devtool: 'source-map',//单独文件，可以定位到哪一列出错了
    // devtool: 'cheap-module-source-map',//单独文件，体积更小，但只能定位到哪一行出错
    // devtool: 'eval-source-map',//不会生成单独文件，
    // devtool: 'cheap-module-eval-source-map',//不会生成单独文件 只定位到行，体积更小
    /*
    loader有三种写法
    use
    loader
    use+loader
    * */
    module: {
        rules: [
            {
                test: require.resolve('jquery'),
                use: {
                    loader: 'expose-loader',
                    options: '$'
                }
            },
            {
                test: /\.js/,
                use: {
                    loader: 'babel-loader',
                    query: {
                        presets: ["env", "stage-0", "react"]
                    }
                }
            },
            {
                //file-loader是解析图片地址，把图片从源位置拷贝到目标位置并且修改原引用地址
                //可以处理任意的二进制，bootstrap 里字体
                //url-loader可以在文件比较小的时候，直接变成base64字符串内嵌到页面中
                test: /\.(png|jpg|gif|svg|bmp|eot|woff|woff2|ttf)/,
                loader: {
                    loader: 'url-loader',
                    options: {
                        limit: 5 * 1024,
                        //指定拷贝文件的输出目录 
                        outputPath: 'images/'
                    }
                }
            },
            {
                test: /\.css$/,//转换文件的匹配正则
                //css-loader用来解析处理CSS文件中的url路径,要把CSS文件变成一个模块
                //style-loader 可以把CSS文件变成style标签插入head中
                //多个loader是有顺序要求的，从右往左写，因为转换的时候是从右往左转换
                //此插件先用css-loader处理一下css文件
                //如果压缩
                loader: cssExtract.extract({
                    use: ["css-loader?minimize"]
                })
                //loader: ["style-loader", "css-loader", "postcss-loader"]
            },
            {
                test: /\.less$/,
                loader: lessExtract.extract({
                    use: ["css-loader?minimize", "less-loader"]
                })
                //use: ["style-loader", "css-loader", "less-loader"]
            },
            {
                test: /\.scss$/,
                loader: sassExtract.extract({
                    use: ["css-loader?minimize", "sass-loader"]
                })
                // use: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(html|htm)/,
                loader: 'html-withimg-loader'
            }
        ]
    },
    plugins: [
        //用来自动向模块内部注入变量
        // new webpack.ProvidePlugin({
        //     $: 'jquery'
        // }),
        new UglifyjsWebpackPlugin(),
        new CleanWebpackPlugin([path.join(__dirname, 'dist')]),
        //此插件可以自动产出html文件
        new HtmlWebpackPlugin({
            template: './src/index.html',//指定产的HTML模板
            filename: `index.html`,//产出的HTML文件名
            title: 'index',
            hash: true,// 会在引入的js里加入查询字符串避免缓存,
            minify: {
                removeAttributeQuotes: true
            }
        }),
        new CopyWebpackPlugin([{
            from: path.join(__dirname, 'public'),
            to: path.join(__dirname, 'dist', 'public')
        }]),
        cssExtract,
        lessExtract,
        sassExtract
    ],
    //配置此静态文件服务器，可以用来预览打包后项目
    devServer: {
        contentBase: './dist',
        host: 'localhost',
        port: 8000,
        compress: true,//服务器返回给浏览器的时候是否启动gzip压缩
    }
}
```

### 5.总结

> 本篇偏向基础，能够搭建起简单的webpack配置，高级进阶会在后续文章推出，并且希望大家多去看官方API然后自我总结输出，只有将知识输出出来，才能更好的记忆和学习

### 6.博客

[魏燃技术博客](http://www.ngaiwe.com)

有任何问题可留言或者发送本人邮箱ngaiwe@126.com