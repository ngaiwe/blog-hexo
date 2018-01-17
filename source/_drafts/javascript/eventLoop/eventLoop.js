const fs = require('fs');
const path = require('path')
const process = require('process')

const timeDateHistory = new Date()

fs.readFile(path.join(__dirname,'1.txt'),function(){
    let timeDateNow = new Date() - timeDateHistory
    console.log(`${timeDateNow}ms readFile01 Time`)  
})
fs.readFile(path.join(__dirname,'2.txt'),function(){
    let timeDateNow = new Date() - timeDateHistory
    console.log(`${timeDateNow}ms readFile02 Time`)  
})
process.nextTick(function(){
    let timeDateNow = new Date() - timeDateHistory
    console.log(`${timeDateNow}ms next Tick Time`)
})
setImmediate(function(){
    let timeDateNow = new Date() - timeDateHistory
    for(let i=0;i<10000000;i++){}
    console.log(`${timeDateNow}ms setImmediate Time`)  
})
setTimeout(function(){
    let timeDateNow = new Date() - timeDateHistory
    console.log(`${timeDateNow}ms setTimeout Time`)  
})