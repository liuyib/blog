(function () {
  'use strict';

  function Runner(containerSelector, optConfig) {
    // 获取游戏的 “根” DOM 节点
    this.outerContainerEl = document.querySelector(containerSelector);
    // canvas 的外层容器
    this.containerEl = null;
  
    this.config = optConfig || Runner.config;
    this.dimensions = Runner.defaultDimensions;
  
    // 用于计算物体位移
    this.currentSpeed = this.config.SPEED; // 移动速度
    this.time = 0;                         // 记录代码运行时间
  
    this.activated  = false; // 游戏彩蛋是否被激活（没有被激活时，屏幕上只显示小恐龙的图片）
    this.playing = false;    // 游戏是否进行中
    this.crashed = false;    // 小恐龙是否碰到了障碍物
    this.paused = false      // 游戏是否暂停
  
    // 加载雪碧图，并初始化游戏
    // 之后的代码逻辑都会通过这个函数间接调用
    this.loadImages();
  }
  
  // 由于 Runner 类的一些属性和方法需要全局调用
  // 所以需要挂载到 window 对象上
  window["Runner"] = Runner;
  
  var DEFAULT_WIDTH = 600;
  var FPS = 60;
  
  // 游戏配置参数
  Runner.config = {
    SPEED: 6 // 移动速度
  };
  
  // 游戏的默认尺寸
  Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150
  };
  
  // 游戏用到的 className
  Runner.classes = {
    CONTAINER: "runner-container",
    CANVAS: "runner-canvas",
    PLAYER: "" // 预留出的 className，用来控制 canvas 的样式
  };
  
  // 雪碧图中各个图片的坐标信息
  Runner.spriteDefinition = {
    LDPI: {
      HORIZON: { x: 2, y: 54 }
    }
  };
  
  Runner.keyCodes = {
    JUMP: { "38": 1, "32": 1 }, // Up, Space
    DUCK: { "40": 1 },          // Down
    RESTART: { "13": 1 }        // Enter
  };
  
  Runner.events = {
    KEYDOWN: "keydown",
    KEYUP: "keyup",
    LOAD: "load",
    BLUR: "blur",
    FOCUS: "focus"
  };

  Runner.prototype = {
    init: function () {
      // 生成 canvas 容器元素
      this.containerEl = document.createElement('div');
      this.containerEl.className = Runner.classes.CONTAINER;
  
      // 生成 canvas
      this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
        this.dimensions.HEIGHT, Runner.classes.PLAYER);
  
      this.ctx = this.canvas.getContext('2d');
      this.ctx.fillStyle = '#f7f7f7';
      this.ctx.fill();
  
      // 加载 Horizon
      this.horizon = new Horizon(this.canvas, this.spritePos,
        this.dimensions, this.config.GAP_COEFFICIENT);
  
      // 将游戏添加到页面中
      this.outerContainerEl.appendChild(this.containerEl);

      // 开始监听用户动作
      this.startListening();

      // 更新 canvas
      this.update();
    },
    loadImages() {
      this.spritePos = Runner.spriteDefinition.LDPI; // 获取雪碧图中图片的坐标信息
      Runner.imageSprite = document.getElementById('offline-resources-1x');
  
      // 当图片加载完成（complete 是 DOM 中 Image 对象自带的一个属性）
      if (Runner.imageSprite.complete) {
        this.init();
      } else { // 图片没有加载完成，监听其 load 事件
        Runner.imageSprite.addEventListener(Runner.events.LOAD,
          this.init.bind(this));
      }
    },
    startListening: function () {
      document.addEventListener(Runner.events.KEYDOWN, this);
      document.addEventListener(Runner.events.KEYUP, this);
    },
    /**
     * 更新游戏帧并进行下一次更新
     */
    update: function () {
      var now = this.getTimeStamp();
      var deltaTime = now - (this.time || now);

      this.time = now;

      if (this.playing) {
        this.clearCanvas();
        this.horizon.update(deltaTime, this.currentSpeed);
      }

      if (this.playing) {
        // 进行下一次更新
        this.scheduleNextUpdate();
      }
    },
    getTimeStamp: function () {
      return performance.now();
    },
    clearCanvas: function () {
      this.ctx.clearRect(0, 0, this.dimensions.WIDTH,
        this.dimensions.HEIGHT);
    },
    scheduleNextUpdate: function () {
      this.raqId = requestAnimationFrame(this.update.bind(this));
    },
    // 用来处理 EventTarget（这里就是 Runner 类） 上发生的事件
    // 当事件被发送到 EventListener 时，浏览器就会自动调用这个方法
    handleEvent: function (e) {
      return (function (eType, events) {
        switch (eType) {
          case events.KEYDOWN:
            this.onKeyDown(e);
            break;
          default:
            break;
        }
      }.bind(this))(e.type, Runner.events);
    },
    onKeyDown: function (e) {
      if (!this.crashed && !this.paused) {
        if (Runner.keyCodes.JUMP[e.keyCode]) {
          e.preventDefault();
  
          if (!this.playing) {
            this.setPlayStatus(true);
            this.update();
          }
        }
      }      
    },
    setPlayStatus: function (isPlaying) {
      this.playing = isPlaying;
    },
  };
  
  /**
   * 生成 canvas 元素
   * @param {HTMLElement} container canva 的容器
   * @param {Number} width canvas 的宽度
   * @param {Number} height canvas 的高度
   * @param {String} optClassName 给 canvas 添加的类名（可选）
   * @return {HTMLCanvasElement}
   */
  function createCanvas(container, width, height, optClassName) {
    var canvas = document.createElement('canvas');
    canvas.className = optClassName
      ? optClassName + ' ' + Runner.classes.CANVAS
      : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
  
    return canvas;
  }

  function HorizonLine(canvas, spritePos) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
  
    this.dimensions = {};       // 地面的尺寸
    this.spritePos = spritePos; // 雪碧图中地面的位置
    this.sourceXPos = [];       // 雪碧图中地面的两种地形的 x 坐标
    this.xPos = [];             // canvas 中地面的 x 坐标
    this.yPos = 0;              // canvas 中地面的 y 坐标
  
    this.bumpThreshold = 0.5;   // 随机地形系数，控制两种地形的出现频率
  
    this.init();
    this.draw();
  }
  
  HorizonLine.dimensions = {
    WIDTH: 600,
    HEIGHT: 12,
    YPOS: 127,  // 绘制到 canvas 中的 y 坐标
  };

  HorizonLine.prototype = {
    init: function () {
      for (const d in HorizonLine.dimensions) {
        if (HorizonLine.dimensions.hasOwnProperty(d)) {
          const elem = HorizonLine.dimensions[d];
          this.dimensions[d] = elem;
        }
      }
      this.sourceXPos = [this.spritePos.x,
        this.spritePos.x + this.dimensions.WIDTH];
      this.xPos = [0, HorizonLine.dimensions.WIDTH];
      this.yPos = HorizonLine.dimensions.YPOS;
    },
    draw: function () {
      // 使用 canvas 中 9 个参数的 drawImage 方法
      this.ctx.drawImage(
        Runner.imageSprite,                   // 原图片
        this.sourceXPos[0], this.spritePos.y, // 原图中裁剪区域的起点坐标
        this.dimensions.WIDTH, this.dimensions.HEIGHT,
        this.xPos[0], this.yPos,              // canvas 中绘制区域的起点坐标
        this.dimensions.WIDTH, this.dimensions.HEIGHT,
      );
      this.ctx.drawImage(
        Runner.imageSprite,
        this.sourceXPos[1], this.spritePos.y,
        this.dimensions.WIDTH, this.dimensions.HEIGHT,
        this.xPos[1], this.yPos,
        this.dimensions.WIDTH, this.dimensions.HEIGHT,
      );
    },
    /**
     * 更新地面
     * @param {Number} deltaTime 间隔时间
     * @param {Number} speed 速度
     */
    update: function (deltaTime, speed) {
      // 计算地面每次移动的距离（距离 = 速度 x 时间）时间由帧率和间隔时间共同决定
      var incre = Math.floor(speed * (FPS / 1000) * deltaTime);

      if (this.xPos[0] <= 0) {
        this.updateXPos(0, incre);
      } else {
        this.updateXPos(1, incre);
      }
      this.draw();
    },
    /**
     * 更新地面的 x 坐标
     * @param {Number} pos 地面的位置
     * @param {Number} incre 移动距离
     */
    updateXPos: function (pos, incre) {
      var line1 = pos;
      var line2 = pos === 0 ? 1 : 0;

      // 第一段地面向左移动，第二段地面随之
      this.xPos[line1] -= incre;
      this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;

      // 第一段地面移出了 canvas
      if (this.xPos[line1] <= -this.dimensions.WIDTH) {
        // 将第一段地面放到 canvas 右侧
        this.xPos[line1] += this.dimensions.WIDTH * 2;
        // 此时第二段地面的 x 坐标刚好和 canvas 的 x 坐标对齐
        this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
        // 给放到 canvas 后面的地面随机地形
        this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
      }
    },
    /**
     * 获取随机的地形
     */
    getRandomType: function () {
      return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
    },
  };

  function Horizon(canvas, spritePos) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
  
    // 地面
    this.horizonLine = null;
  
    this.init();
  }

  Horizon.prototype = {
    init: function () {
      this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    },
    update: function (deltaTime, currentSpeed) {
      this.horizonLine.update(deltaTime, currentSpeed);
    },
  };
})();