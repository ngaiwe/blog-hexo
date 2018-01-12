---
title: promise 原理解析
date: 2018/01/11
categories:
- javascript
tags:
- javascript
- es6
- es7
- promise
- promise.all
- promise.race
- promise.resolve
- promise.reject
---

###### promise用法，根据promise/A+协议，分析promise原理，具体协议请查阅 https://segmentfault.com/a/1190000002452115

## 创建一个文件index.js并且创建一个promise实例,创建随机数num 当大于0.5时resolve，当小于0.5时reject，用then方法接收resolve返回值为value，reject返回值为reason
{% codeblock index.js %}
let promiseA = new Promise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功')
        }else{
            reject('小于失败')
        }
    },2000)
})
promiseA.then((value)=>{
    console.log(value)
},(reason)=>{
    console.log(reason)
})
{% endcodeblock %}
## 这是原生promise实例，现在开始创建我们自己的promise
### 1.首先创建一个新的文件myPromise.js，将其导出，以便引用。其中task为new Promise(callback)的callback函数
{% codeblock myPromise.js %}
function myPromise(task){

}
module.exports = myPromise
{% endcodeblock %}
### 2.在index.js文件中引入我们创建的myPromise，并且生成新实例new MyPromise()
{% codeblock index.js %}
const MyPromise = require('./myPromise')

let promiseA = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功')
        }else{
            reject('小于失败')
        }
    },2000)
})

promiseA.then((value)=>{
    console.log(value)
},(reason)=>{
    console.log(reason)
})
{% endcodeblock %}
## 在myPromise.js文件中添加如下代码，在这里用self接受this对象，然后给myPromise构造函数添加属性，state代表状态pending fulfilled和rejected的变化，value和reason分别用来保存myPromise实例resolve和reject传入的值而不是自身构造函数的形参，resolve和reject函数来接收new myPromise的resolve和reject的参数
{% codeblock myPromise.js %}
let self = this
self.state = 'pending'
self.value = undefined
self.reason = undefined

function resolve(value){

}
function reject(reason){

}
try{
    task(resolve,reject)
}catch(error){
    reject(error)
}
{% endcodeblock %}
## myPromise构造函数添加onResolvedCallbacks和onRejectedCallbacks,用于临时保存then中函数，当实例resolve和reject的时候以便调用。在resolve函数中，先判断value是否是Promise的实例，如果是，说明resolve返回的是一个promise对象，所以递归value。当resolve或者reject调用的时候分别改变state状态为fulfilled和rejected。当调用then时，如果当前状态为fulfilled成功，则直接返回then的onFulfilled函数向外返回vaule，如果是rejectd状态，则调用onRejected函数，向外返回reason，如果正处于pending等候状态，则分别向onResolvedCallbacks，onRejectedCallbacks添加onFulFilled和onRejected以便resolve和reject调用
{% codeblock myPromise.js %}
function myPromise(task){
    let self = this
    self.state = 'pending'
    self.value = undefined
    self.reason = undefined

    self.onResolvedCallbacks = []
    self.onRejectedCallbacks = []
    function resolve(value){
        if(value instanceof Promise){
            return value.task(resolve,reject)
        }
        setTimeout(()=>{
            self.state = 'fulfilled'
            self.value = value
            self.onResolvedCallbacks.forEach(item=>item(self.value))    
        })
    }
    function reject(reason){
        setTimeout(()=>{
            self.state = 'rejected'
            self.reason = reason
            self.onRejectedCallbacks.forEach(item=>item(self.reason))
        })
    }
    try{
        task(resolve,reject)
    }catch(error){
        reject(error)
    }
}
myPromise.prototype.then = function(onFulFilled,onRejected){
    let self = this
    if(self.state == 'fulfilled'){
        onFulFilled(self.value)
    }else if(self.state == 'rejected'){
        onRejected(self.reason)
    }else if(self.state == 'pending'){
        self.onResolvedCallbacks.push(onFulFilled)
        self.onRejectedCallbacks.push(onRejected)
    }
}
{% endcodeblock %}

## 现在改动一下index.js文件如下，在Promise的then方法上实现链式调用，也就是说第一个then返回的是一个promise对象，然后在调用then
{% codeblock index.js %}
const MyPromise = require('./myPromise')

let promiseA = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功')
        }else{
            reject('小于失败')
        }
    },2000)
})

promiseA.then((value)=>{
    console.log(`我是value： ${value}`)
    return new MyPromise((resolve,reject)=>{
        resolve(value)
    })
},(reason)=>{
    console.log(reason)
}).then((data)=>{
    console.log(`我是data： ${data}`)
})
{% endcodeblock %}

## 来让我们看一下myPromise.js这个文件,myPromise构造函数不做改动，先说一下then方法的改变，根据promise/A+协议，then必须返回一个promise对象，所以创建promise2，让then最终返回的是一个promise对象，在promise2中构建myPromise实例用法就是将task函数展现出来，根据协议说Promise解析过程 是以一个promise和一个值做为参数的抽象过程，可表示为[[Resolve]](promise, x)，所以重新封装一个函数resolvePromise接收promise2，x(协议：onFulfilled 或 onRejected 返回了值x, 则执行Promise 解析流程[[Resolve]](promise2, x)），resolve,reject封装函数调用
{% codeblock myPromise.js %}
function resolvePromise(promise2,x,resolve,reject){

}

myPromise.prototype.then = function(onFulFilled,onRejected){
    let self = this
    let promise2
    if(self.state == 'fulfilled'){
        promise2 = new myPromise((resolve,reject)=>{
            let x = onFulFilled(self.value)
            resolvePromise(promise2,x,resolve,reject)
        })
    }else if(self.state == 'rejected'){
        promise2 = new myPromise((resolve,reject)=>{
            let x = onRejected(self.reason)
            resolvePromise(promise2,x,resolve,reject)
        })
    }else if(self.state == 'pending'){
        promise2 = new myPromise((resolve,reject)=>{
            self.onResolvedCallbacks.push((value)=>{
                let x = onFulFilled(value)
                resolvePromise(promise2,x,resolve,reject)
            })
            self.onRejectedCallbacks.push((reason)=>{
                let x = onRejected(reason)
                resolvePromise(promise2,x,resolve,reject)
            })
        })
    }
    return promise2
}
{% endcodeblock %}

## 让我们来看一下resolvePromise这个函数，根据协议先判断是否是重复调用，然后定义then，called变量，根据协议判断x是否是对象还是函数，如果是字符串直接resolve，根据协议（如果在取x.then值时抛出了异常，则以这个异常做为原因将promise拒绝。）try/catch，然后让then等于x.then 判断then是否是函数，如果是则说明他是一个promise对象，不是则只是一个普通对象，直接resolve。让then的this指向x，根据协议（当 resolvePromise 被以 y为参数调用, 执行 [[Resolve]](promise, y)）则递归resolvePromise。根据协议，当resolvePromise和rejectPromise同时调用或者调用多次，则忽略后面的，所以用called阻止多次调用
{% codeblock myPromise.js %}
function resolvePromise(promise2,x,resolve,reject){
    if(promise2 === x)reject(new TypeError('重复调用'))
    let then,called
    if(x !=null &&(typeof x === 'function' || typeof x === 'object')){
        try {
            then = x.then
            if(typeof then === 'function'){
                then.call(x,function(y){
                    if(called)return
                    called = true
                    resolvePromise(promise2,y,resolve,reject)
                },function(err){
                    if(called)return
                    called = true
                    reject(err)
                })
            }else{
                resolve(x)
            }
        } catch (error) {
            if(called)return
            called = true
            reject(error)
        }
    }else{
        resolve(x)
    }
}
{% endcodeblock %}

## 下面是myPromise.all方法
### index.js改动如下 两个myPromise实例 分别异步时间不同
{% codeblock index.js %}
const MyPromise = require('./myPromise')

let promiseA = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功A')
        }else{
            reject('小于失败A')
        }
    },2000)
})
let promiseB = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功B')
        }else{
            reject('小于失败B')
        }
    },3000)
})

MyPromise.all([promiseA,promiseB]).then((value)=>{
    console.log(`我是value1： ${value[0]}`)
    console.log(`我是value2： ${value[1]}`)
},(reason)=>{
    console.log(`我是reason： ${reason}`)
})
{% endcodeblock %}
### myPromise.js文件添加如下代码，在myPromise自身设置一个all方法，传入进入的是一个数组promises，返回的也是一个promise对象，用result保存多个promise返回的值，循环promises分别调用then方法，当i===primises.lenght-1时并且called为true时,就是说明所有promise都执行完毕并且没有报错，则直接resolve这个result数组结果，只要一个报错，直接reject
{% codeblock myPromise.js %}
myPromise.all = function(promises){
    return new myPromise((resolve,reject)=>{
        let result = []
        let called = true
        for(let i=0;i<promises.length;i++){
            promises[i].then((value)=>{
                result[i] = value
                if(i=== promises.length-1 && called){
                    resolve(result)
                }
            },(reason)=>{
                called = false
                reject(reason)
            })
        }
    })
}
{% endcodeblock %}
## 下面是myPromise.race方法
### 和all方法的index.js差别在让promiseB时间短，好看出B能在A前一步执行完
{% codeblock index.js %}
const MyPromise = require('./myPromise')

let promiseA = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功A')
        }else{
            reject('小于失败A')
        }
    },2000)
})
let promiseB = new MyPromise((resolve,reject)=>{
    let num = Math.random()
    setTimeout(()=>{
        if(num>.5){
            resolve('大于成功B')
        }else{
            reject('小于失败B')
        }
    },1000)
})

MyPromise.race([promiseA,promiseB]).then((value)=>{
    console.log(`我是value： ${value}`)
},(reason)=>{
    console.log(`我是reason： ${reason}`)
})
{% endcodeblock %}
### myPromise文件给MyPromise添加静态方法race，和all相似，不过在调用promise的then方法时，让数组保存临时值，判断当数组length为1时，则直接执行resolve或者reject
{% codeblock myPromise.js %}
MyPromise.race = function(promises){
    return new MyPromise((resolve,reject)=>{
        let result = []
        promises.forEach(promise=>{
            promise.then((value)=>{
                result.push(value)
                if(result.length == 1){
                    resolve(value)
                }
            },(reason)=>{
                result.push(reason)
                if(result.length == 1){
                    reject(reason)
                }
            })
        })
    })
}
{% endcodeblock %}

