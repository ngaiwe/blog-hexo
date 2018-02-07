---
title: node stream源码分析 — Readable
date: 2018/02/02
categories:
- nodejs
tags:
- node
- stream
- fs
- Readable
- Writable
- Duplex
- Transform
---
# node stream源码分析 — Readable

## stream简述

### stream分为四种，如下：

- stream.Readable — 输入流
- stream.Writable — 输出流
- stream.Duplex — 双工流
- stream.Transform — 转换流

### 流拥有两种模式

- 二进制模式，以Buffer、String、Uint8Array
- 对象模式，流的内部是对象形式

### 输入流（stream.Readable）

> 输入流有两种模式，一种是流动模式，另一种是非流动模式
>
> 非流动模式就是监听data方法，直接读取read不暂停，不存到缓存区
>
> 流动模式就是监听readable方法，就是讲读取内容放到缓存区内，等待writable调用，在判断是否有空位，在取消暂停

#### Readable源码分析

> 首先看下面Readable的源码，对照Readable源码再看stream做了哪些操作
>
> _stream_readable.js文件

``` bash
// 首先监听data或者readable的时候，进入Readable.prototype.on —— 778行
Readable.prototype.on = function(ev, fn) {//传进来一个ev代表监听参数，fn回调函数
  const res = Stream.prototype.on.call(this, ev, fn);//继承Stream的on方法，传入ev，fn

  if (ev === 'data') {//监听data
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false)//flowing 是在Readable函数中定义看下面Readable函数，不等于false代表流动模式
      this.resume();// 开始读取
  } else if (ev === 'readable') {//监听readable
    const state = this._readableState;//设置state常量为_readableState，具体看下面Readable函数
    if (!state.endEmitted && !state.readableListening) {//如果ended没有触发或者不为流动模式，则readableListening，needReadable为true让其成为流动模式，并且需要Readable，不触发Readable
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {//如果没有正在读取，则下一个事件环调用nReadingNextTick，见下代码
        process.nextTick(nReadingNextTick, this);
      } else if (state.length) {//如果缓存区长度存在，则执行emitReadable，代码见下
        emitReadable(this);
      }
    }
  }

  return res;//返回res
};

// Readable函数 —— 141行
function Readable(options) {//将createReadStream中的options传入
  if (!(this instanceof Readable))//判断有没有new Readable()
    return new Readable(options);

  this._readableState = new ReadableState(options, this);//设置ReadableState实例，命名为this._readableState，具体ReadableState构造函数看下方ReadableState函数函数

  // legacy
  this.readable = true;//、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、

  if (options) {//判断参数是否存在
    if (typeof options.read === 'function')//判断是否调用的new Readable
      this._read = options.read;//让函数内部_read方法指向read方法

    if (typeof options.destroy === 'function')
      this._destroy = options.destroy;//让函数内部_destroy方法指向destroy方法
  }

  Stream.call(this);//options不存在，继承Stream
}

// ReadableState函数 —— 59行
function ReadableState(options, stream) {//接收options和Readable上下文
  options = options || {};//options为空则命options为空对象

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Stream.Duplex;//用来判断是否是双工流

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;//对象流的标识，如果是对象流忽视read中的n参数

  if (isDuplex)//同this.objectMode用法一样
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;//获取传入highWaterMark值
  var readableHwm = options.readableHighWaterMark;//设置可读流highWaterMark
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;//默认的highWaterMark

  if (hwm || hwm === 0)
    this.highWaterMark = hwm;//如果参数highWaterMark存在或者为0数值则设置此构造函数属性highWaterMark
  else if (isDuplex && (readableHwm || readableHwm === 0))
    this.highWaterMark = readableHwm;//如果是双工流并且可读流highWaterMark存在则设置此构造函数属性highWaterMark
  else
    this.highWaterMark = defaultHwm;//否则this.highWaterMark为默认值

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);//向下取整

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();//设置缓存区大小，采用BufferList,链式结构
  this.length = 0;//设置缓存区长度
  this.pipes = null;//下一个管道是否存在
  this.pipesCount = 0;//设置管道数量
  this.flowing = null;//设置是否为流动或非流动模式
  this.ended = false;//Readable状态标识，true表示数据读取完毕
  this.endEmitted = false;//Readable状态标识，为true表示ended已经触发
  this.reading = false;//表示正在调用_read

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;//让emitReadable是在这个事件环还是下个事件环触发

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;//是否需要Readable事件触发
  this.emittedReadable = false;//触发Readable事件
  this.readableListening = false;//是否准备切换流动模式
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;//是否已经关闭

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';//设置Encoding

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;//在pipe中等待下一个管道触发的数量

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;//readable读取没达到最高水位线是否需要读取更多，知道缓存区满

  //编码转换，解决乱码问题
  this.decoder = null;//解码器
  this.encoding = null;//编码
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}
```

> 下面是createReadStream创建读取流的源码  ————————  fs.js文件

``` bash
//fs.createReadStream —— 1977行
fs.createReadStream = function(path, options) {
  return new ReadStream(path, options);//首先返回ReadStream构造函数实例
};

util.inherits(ReadStream, Readable);//继承Readable
fs.ReadStream = ReadStream;

function ReadStream(path, options) {//传入文件路径，options参数
  if (!(this instanceof ReadStream))//判断有没有new ReadStream()
    return new ReadStream(path, options);

  // a little bit bigger buffer and water marks by default
  options = copyObject(getOptions(options, {}));//getOptions、copyObject函数源码如下
  if (options.highWaterMark === undefined)
    options.highWaterMark = 64 * 1024;//设置默认highWaterMark

  Readable.call(this, options);//继承Readable，并且将options传入

  handleError((this.path = getPathFromURL(path)));
  this.fd = options.fd === undefined ? null : options.fd;//设置文件描述符
  this.flags = options.flags === undefined ? 'r' : options.flags;//设置标识符是读取操作
  this.mode = options.mode === undefined ? 0o666 : options.mode;//设置权限，默认0o666

  this.start = options.start;//设置读取开始位置
  this.end = options.end;//设置读取结束位置
  this.autoClose = options.autoClose === undefined ? true : options.autoClose;//设置是否自动关闭
  this.pos = undefined;//读取初始值
  this.bytesRead = 0;//读取数量
  this.closed = false;

  if (this.start !== undefined) {
    if (typeof this.start !== 'number') {//判断读取开始位置如果不是数值报错
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE',
                                 'start',
                                 'number',
                                 this.start);
    }
    if (this.end === undefined) {
      this.end = Infinity;//如果没有设置end，则无穷大
    } else if (typeof this.end !== 'number') {//读取截至位置不是数值，报错
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE',
                                 'end',
                                 'number',
                                 this.end);
    }

    if (this.start > this.end) {//如果读取开始位置大于读取结束位置，报错
      const errVal = `{start: ${this.start}, end: ${this.end}}`;
      throw new errors.RangeError('ERR_VALUE_OUT_OF_RANGE',
                                  'start',
                                  '<= "end"',
                                  errVal);
    }

    this.pos = this.start;//让那个pos为读取开始位置判断后的正确结果
  }

  if (typeof this.fd !== 'number')
    this.open();//如果fd不存在，说明文件没有打开，则调用打开方法,见下面open方法

  this.on('end', function() {//监听end，如果触发end监听，判断为自动关闭为true则调用关闭函数destroy
    if (this.autoClose) {
      this.destroy();
    }
  });
}

//getOptions函数 —— 76行
function getOptions(options, defaultOptions) {//传入options和空对象默认值
  if (options === null || options === undefined ||
      typeof options === 'function') {//判断options不存在，或者是函数类型，返回给copyObject函数为空对象
    return defaultOptions;
  }

  if (typeof options === 'string') {
  	//如果是options是字符串，defaultOptions的encoding为options，options为defaultOptions对象
    defaultOptions = util._extend({}, defaultOptions);
    defaultOptions.encoding = options;
    options = defaultOptions;
  } else if (typeof options !== 'object') {
  //如果options为对象，则报错
    throw new errors.TypeError('ERR_INVALID_ARG_TYPE',
                               'options',
                               ['string', 'Object'],
                               options);
  }

  if (options.encoding !== 'buffer')
  	如果options.encoding 不是buffer，则转换
    assertEncoding(options.encoding);
  return options;
}

//copyObject函数 —— 98行
function copyObject(source) {
  var target = {};
  for (var key in source)
  	//遍历getOptions的返回值options
    target[key] = source[key];
  return target;//返回一个新对象
}

//open方法 —— 2046行
ReadStream.prototype.open = function() {
  var self = this;//定义this
  fs.open(this.path, this.flags, this.mode, function(er, fd) {//node fs.open API
    if (er) {
      if (self.autoClose) {//如果报错并且自动关闭为true，则调用关闭方法
        self.destroy();
      }
      self.emit('error', er);//触发error，外部监听
      return;
    }

    self.fd = fd;//打开成功，定义this.fd
    self.emit('open', fd);//触发open监听，传入fd
    // start the flow of data.
    self.read();//开始流动模式，调用父类Readable read()方法，见下
  });
};
```

> Readable ————  _stream_readable.js文件

``` bash
//Readable read方法 —— 372行
Readable.prototype.read = function(n) {
  debug('read', n);//debug
  n = parseInt(n, 10);//n转为10进制取整
  var state = this._readableState;//就是new ReadableState的实例，看上面Readable源码
  var nOrig = n;//声明变量nOrig为传入的n

  if (n !== 0)
    state.emittedReadable = false;//如果n不为0，则让触发Readable为false

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
      //如果n为0并且需要Readable并且，缓存区长度大于等于highWaterMark，则debuglog
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);//如果缓存区长度为0并且读取完毕，则触发endReadable函数，如下
    else
      emitReadable(this);//否则触发emitReadable ，如下
    return null;//最后返回null
  }

  n = howMuchToRead(n, state);//执行howMuchToRead，如下

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {//如果n为0并且读取结束
    if (state.length === 0)//如果缓存区长度为0，则执行endReadable，如下
      endReadable(this);
    return null;//返回null
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;//命名doRead为是否需要Readable
  debug('need readable', doRead);//debuglog

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;//如果缓存区长度为0，或者缓存区长度减去n小于highWaterMark，则需要Readable
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;//如果读取结束，或者正在读取，则不需要Readable
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;//如果需要Readable，则正在读取
    state.sync = true;//让emitReadable在下个事件环执行
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)//如果缓存区长度为0，则需要Readable
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);//然后调用子集方法_read，代码如下
    state.sync = false;//让emitReadable在本次事件环
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading)//如果没有正在读取，则n等于howMuchToRead
      n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0)
    ret = fromList(n, state);//如果n大于0，则
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;//如果ret为null，则需要Readable
    n = 0;
  } else {
    state.length -= n;//缓存区减去n
  }

  if (state.length === 0) {//如果缓存区长度为0
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended)//如果没有读取结束，则需要Readable
      state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended)//如果nOrig不等于n或者读取结束，则调用endReadable，看endReadable代码
      endReadable(this);
  }

  if (ret !== null)//如果ret不等于null，则触发data，流动模式，返回ret
    this.emit('data', ret);

  return ret;
};

// endReadable —— 1087行
function endReadable(stream) {
  var state = stream._readableState;//state赋值为new ReadableState实例

  if (!state.endEmitted) {//如果ended没有触发
    state.ended = true;//让ended为true，读取完状态
    process.nextTick(endReadableNT, state, stream);//下一个微观队列调用endReadableNT
  }
}
function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {//如果ended没有触发并且缓存区长度为0
    state.endEmitted = true;//让endEmitted为true表示ended已经触发
    stream.readable = false;//readable为false
    stream.emit('end');//触发end监听
  }
}

//emitReadable —— 505
function emitReadable(stream) {
  var state = stream._readableState;//state赋值为new ReadableState实例
  state.needReadable = false;//设置不需要readable
  if (!state.emittedReadable) {//不触发readable事件
    debug('emitReadable', state.flowing);//debuglog
    state.emittedReadable = true;//让那emittedReadable为true，表示触发readable
    if (state.sync)//sync为true，让emitReadable_为下个事件环(微观队列)
      process.nextTick(emitReadable_, stream);
    else
      emitReadable_(stream);//否则直接触发emitReadable_
  }
}

function emitReadable_(stream) {
  debug('emit readable');//debuglog
  stream.emit('readable');//触发readable监听
  flow(stream);//执行flow
}
function flow(stream) {
  const state = stream._readableState;//state赋值为new ReadableState实例
  debug('flow', state.flowing);//debuglog
  while (state.flowing && stream.read() !== null);//flowing为true流动模式并且read()不为null，循环read()
}

//howMuchToRead —— 346行
function howMuchToRead(n, state) {
  if (n <= 0 || (state.length === 0 && state.ended))
    return 0;//如果n小于等于0或者缓存区长度为0并且已经结束，则返回0
  if (state.objectMode)
    return 1;//如果处理的是对象流，返回1
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length)//流动模式并且存在length
      return state.buffer.head.data.length;//返回bufferList头部数据
    else
      return state.length;//否则返回缓存区大小
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark)//如果n大于highWaterMark
    state.highWaterMark = computeNewHighWaterMark(n);//highWaterMark为computeNewHighWaterMark返回值，如下
  if (n <= state.length)
    return n;//如果n小于缓存区长度返回n
  // Don't have enough
  if (!state.ended) {//如果读取没有结束，则需要Readable返回0
    state.needReadable = true;
    return 0;
  }
  return state.length;//最后返回缓存区长度
}
// Don't raise the hwm > 8MB
const MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {//如果n大于等于8M，则返回最大值8M，否则
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;//返回n的二进制形式
}

//fromList —— 974行
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0)
    return null;

  var ret;
  if (state.objectMode)
    ret = state.buffer.shift();//如果是对象流，则ret等于第一个buffer
  else if (!n || n >= state.length) {//如果n不存在或者n大于缓存区长度
    // read it all, truncate the list
    if (state.decoder)//如果解码存在
      ret = state.buffer.join('');//将buffer拼接为数组
    else if (state.buffer.length === 1)
      ret = state.buffer.head.data;//如果buffer.length为1，则拿去bufferList头部数据
    else
      ret = state.buffer.concat(state.length);//否则将缓存区合并
    state.buffer.clear();//清空buffer
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);//调用fromListPartial，如下
  }

  return ret;返回ret
}
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {//如果n小于bufferlist头部data的长度
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);//截取bufferList0-n数量
    list.head.data = list.head.data.slice(n);//从新赋值bufferlist为n以后的
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();//如果n等于bufferlist头部data长度，则ret等于bufferList的第一个数据包括head data
  } else {
    // result spans more than one buffer
    //如果n大于bufferList头部data长度，则判断state.decoder解码类型，字符串调用copyFromBufferString，buffer调用copyFromBuffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;//返回ret
}
function copyFromBufferString(n, list) {
  var p = list.head;//p为bufferList的头部
  var c = 1;
  var ret = p.data;//ret为头部data
  n -= ret.length;//n减去data长度
  while (p = p.next) {
    const str = p.data;
    const nb = (n > str.length ? str.length : n);//如果n大于bufferList头部data长度，则n等于data长度否则为n
    if (nb === str.length)
      ret += str;//如果nb等于bufferList头部data长度，则ret加等于bufferList头部data
    else
      ret += str.slice(0, n);//否则加等于从0-n截取的头部data
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next)
          list.head = p.next;
        else
          list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;//返回ret
}
function copyFromBuffer(n, list) {
  const ret = Buffer.allocUnsafe(n);//创建一个n长度的buffer
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    const buf = p.data;
    const nb = (n > buf.length ? buf.length : n);
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next)
          list.head = p.next;
        else
          list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}
```

> Fs.js文件

``` bash
// _read —— 2064行
const kMinPoolSpace = 128;
ReadStream.prototype._read = function(n) {
  if (typeof this.fd !== 'number') {//如果文件没打开，则监听一次open等待触发调用_read(n)
    return this.once('open', function() {
      this._read(n);
    });
  }

  if (this.destroyed)//如果关闭，直接停止执行代码
    return;

  if (!pool || pool.length - pool.used < kMinPoolSpace) {
    // discard the old pool.
    //如果pool不存在，或者pool长度减去pool.used小于kMinPoolSpace，则调用allocNewPool，传入readableHighWaterMark，pool就是要真正读取的长度
    allocNewPool(this.readableHighWaterMark);
  }

  // Grab another reference to the pool in the case that while we're
  // in the thread pool another read() finishes up the pool, and
  // allocates a new one.
  var thisPool = pool;//thisPool为pool
  var toRead = Math.min(pool.length - pool.used, n);//取最小，比较真正读取的长度和传入n长度
  var start = pool.used;//start为used

  if (this.pos !== undefined)//如果开始读取位置不存在，则toRead为结束减去开始+1，和上面toRead取最小
    toRead = Math.min(this.end - this.pos + 1, toRead);

  // already read everything we were supposed to read!
  // treat as EOF.
  if (toRead <= 0)
    return this.push(null);//缓存区加入null

  // the actual read.
  //fs.read读取操作fd,数据将被写入到的buffer-pool，pool.used写入偏移量，toRead读取长度
  fs.read(this.fd, pool, pool.used, toRead, this.pos, (er, bytesRead) => {
    if (er) {
      if (this.autoClose) {
        this.destroy();//如果自动关闭为true，调用自动关闭函数，内部触发close
      }
      this.emit('error', er);//如果报错，触发error监听
    } else {
      var b = null;
      if (bytesRead > 0) {//如果bytesRead读取长度大于0，this.bytesRead就加等于bytesRead，并且b等于写入缓存区长度的截取从开始位置到读取bytesRead的长度
        this.bytesRead += bytesRead;
        b = thisPool.slice(start, start + bytesRead);
      }

      this.push(b);//将b加入缓存区
    }
  });
    // move the pool positions, and internal position for reading.
  if (this.pos !== undefined)//如果开始位置不存在，则pos加等于toRead，并且pool.used加等于toRead
    this.pos += toRead;
  pool.used += toRead;
};
var pool;//1969行
function allocNewPool(poolSize) {
  pool = Buffer.allocUnsafe(poolSize);//设置pool的buffer大小
  pool.used = 0;
}
```







