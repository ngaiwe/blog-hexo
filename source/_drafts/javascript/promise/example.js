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

// promiseA.then((value)=>{
//     console.log(`我是value： ${value}`)
//     return new MyPromise((resolve,reject)=>{
//         resolve(value)
//     })
// },(reason)=>{
//     console.log(reason)
// }).then((data)=>{
//     console.log(`我是data： ${data}`)
// })