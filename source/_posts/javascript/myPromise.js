function MyPromise(task){
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

MyPromise.prototype.then = function(onFulFilled,onRejected){
    onFulFilled = typeof onFulFilled === 'function'?onFulFilled:value=>value
    onRejected = typeof onRejected === 'function'?onRejected:reason=>{throw reason}
    let self = this
    let promise2
    if(self.state == 'fulfilled'){
        promise2 = new MyPromise((resolve,reject)=>{
            try {
                let x = onFulFilled(self.value)
                resolvePromise(promise2,x,resolve,reject)
            } catch (error) {
                reject(err)
            }
        })
    }else if(self.state == 'rejected'){
        promise2 = new MyPromise((resolve,reject)=>{
            try {
                let x = onRejected(self.reason)
                resolvePromise(promise2,x,resolve,reject)
            } catch (error) {
                reject(error)
            }
        })
    }else if(self.state == 'pending'){
        promise2 = new MyPromise((resolve,reject)=>{
            self.onResolvedCallbacks.push((value)=>{
                try {
                    let x = onFulFilled(value)
                    resolvePromise(promise2,x,resolve,reject)
                } catch (error) {
                    reject(error)
                }
            })
            self.onRejectedCallbacks.push((reason)=>{
                try {
                    let x = onRejected(reason)
                    resolvePromise(promise2,x,resolve,reject)
                } catch (error) {
                    reject(error)
                }
            })
        })
    }
    return promise2
}
MyPromise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
}
MyPromise.deferred = MyPromise.defer = function () {
    var defer = {};
    defer.promise = new MyPromise(function (resolve, reject) {
      defer.resolve = resolve;
      defer.reject = reject;
    })
    return defer;
  }
MyPromise.all = function(promises){
    return new MyPromise((resolve,reject)=>{
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

module.exports = MyPromise