(function () {
  'use strict';

  /**
   * 游戏主体类，控制游戏的整体逻辑
   * @param {String} containerSelector 画布外层容器的选择器
   * @param {Object} opt_config 配置选项
   */
  function Runner(containerSelector, opt_config) {
    // 获取游戏的 “根” DOM 节点，整个游戏都会输出到这个节点里
    this.outerContainerEl = document.querySelector(containerSelector);
    // canvas 的外层容器
    this.containerEl = null;

    this.config = opt_config || Runner.config;
    this.dimensions = Runner.defaultDimensions;

    this.time = 0;                         // 时钟计时器
    this.currentSpeed = this.config.SPEED; // 当前的速度

    this.activated  = false; // 游戏彩蛋是否被激活（没有被激活时，游戏不会显示出来）
    this.playing = false;    // 游戏是否进行中
    this.crashed = false;    // 小恐龙是否碰到了障碍物
    this.paused = false      // 游戏是否暂停

    // 加载雪碧图，并初始化游戏
    this.loadImages();
  }

  window['Runner'] = Runner;

  var DEFAULT_WIDTH = 600;
  var FPS = 60;

  // 游戏配置参数
  Runner.config = {
    SPEED: 6, // 移动速度
    ARCADE_MODE_INITIAL_TOP_POSITION: 35,  // 街机模式时，canvas 距顶部的初始距离
    ARCADE_MODE_TOP_POSITION_PERCENT: 0.1, // 街机模式时，canvas 距页面顶部的距离，占屏幕高度的百分比
  };

  // 游戏画布的默认尺寸
  Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150,
  };

  // 游戏用到的 className
  Runner.classes = {
    ARCADE_MODE: 'arcade-mode',
    CONTAINER: 'runner-container',
    CANVAS: 'runner-canvas',
    PLAYER: '', // 预留出的 className，用来控制 canvas 的样式
  };

  // 雪碧图中图片的坐标信息
  Runner.spriteDefinition = {
    LDPI: {
      HORIZON: { x: 2, y: 54 }, // 地面
      CLOUD: {x: 86, y: 2},
    },
  };

  // 游戏中用到的键盘码
  Runner.keyCodes = {
    JUMP: { '38': 1, '32': 1 }, // Up, Space
    DUCK: { '40': 1 },          // Down
    RESTART: { '13': 1 },       // Enter
  };

  // 游戏中用到的事件
  Runner.events = {
    ANIMATION_END: 'webkitAnimationEnd',
    KEYDOWN: 'keydown',
    KEYUP: 'keyup',
    LOAD: 'load',
    BLUR: 'blur',
    FOCUS: 'focus'
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

      // 加载背景类 Horizon
      this.horizon = new Horizon(this.canvas, this.spriteDef,
        this.dimensions);

      // 将游戏添加到页面中
      this.outerContainerEl.appendChild(this.containerEl);

      // 更新 canvas
      this.update();

      // 开始监听用户动作
      this.startListening();
    },
    loadImages() {
      // 图片在雪碧图中的坐标
      this.spriteDef = Runner.spriteDefinition.LDPI;

      // 获取雪碧图
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
    stopListening: function () {
      document.removeEventListener(Runner.events.KEYDOWN, this);
      document.removeEventListener(Runner.events.KEYUP, this);
    },
    /**
     * 游戏被激活时的开场动画
     * 将 canvas 的宽度调整到最大
     */
    playIntro: function () {
      if (!this.activated && !this.crashed) {
        this.playingIntro = true; // 正在执行开场动画

        // 定义 CSS 动画关键帧
        var keyframes = '@-webkit-keyframes intro { ' +
            'from { width:' + Trex.config.WIDTH + 'px }' +
            'to { width: ' + this.dimensions.WIDTH + 'px }' +
          '}';
        // 将动画关键帧插入页面中的第一个样式表
        document.styleSheets[0].insertRule(keyframes, 0);

        this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
        this.containerEl.style.width = this.dimensions.WIDTH + 'px';

        // 监听动画。当触发结束事件时，设置游戏为开始状态
        this.containerEl.addEventListener(Runner.events.ANIMATION_END,
          this.startGame.bind(this));

        this.setPlayStatus(true); // 设置游戏为进行状态
        this.activated = true;    // 游戏彩蛋被激活
      } else if (this.crashed) {
        // 这个 restart 方法的逻辑这里先不实现
        this.restart();
      }
    },
    /**
     * 更新游戏为开始状态
     */
    startGame: function () {
      this.setArcadeMode();      // 进入街机模式

      this.playingIntro = false; // 开场动画结束
      this.containerEl.style.webkitAnimation = '';

      window.addEventListener(Runner.events.BLUR,
        this.onVisibilityChange.bind(this));

      window.addEventListener(Runner.events.FOCUS,
        this.onVisibilityChange.bind(this));
    },
    /**
     * 当页面失焦时，暂停游戏
     */
    onVisibilityChange: function (e) {
      if (document.hidden || document.webkitHidden || e.type == 'blur' ||
        document.visibilityState != 'visible') {
        this.stop();
      } else if (!this.crashed) {
        this.play();
      }
    },
    play: function () {
      if (!this.crashed) {
        this.setPlayStatus(true);
        this.paused = false;
        this.time = getTimeStamp();
        this.update();
      }
    },
    stop: function () {
      this.setPlayStatus(false);
      this.paused = true;
      cancelAnimationFrame(this.raqId);
      this.raqId = 0;
    },
    /**
     * 更新游戏帧并进行下一次更新
     */
    update: function () {
      this.updatePending = false; // 等待更新

      var now = getTimeStamp();
      var deltaTime = now - (this.time || now);

      this.time = now;

      if (this.playing) {
        this.clearCanvas();
        
        // 刚开始 this.playingIntro 不存在 !this.playingIntro 为真
        if (!this.playingIntro) {
          this.playIntro(); // 执行开场动画
        }

        // 直到开场动画结束再移动地面
        if (this.playingIntro) {
          this.horizon.update(0, this.currentSpeed);
        } else {
          deltaTime = !this.activated ? 0 : deltaTime;
          this.horizon.update(deltaTime, this.currentSpeed);
        }
      }

      if (this.playing) {
        // 进行下一次更新
        this.scheduleNextUpdate();
      }
    },
    clearCanvas: function () {
      this.ctx.clearRect(0, 0, this.dimensions.WIDTH,
        this.dimensions.HEIGHT);
    },
    scheduleNextUpdate: function () {
      if (!this.updatePending) {
        this.updatePending = true;
        this.raqId = requestAnimationFrame(this.update.bind(this));
      }
    },
    /**
     * 设置进入街机模式时 canvas 容器的缩放比例
     */
    setArcadeModeContainerScale: function () {
      var windowHeight = window.innerHeight;
      var scaleHeight = windowHeight / this.dimensions.HEIGHT;
      var scaleWidth = window.innerWidth / this.dimensions.WIDTH;
      var scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
      var scaledCanvasHeight = this.dimensions.HEIGHT * scale;

      // 将 canvas 横向占满屏幕，纵向距离顶部 10% 窗口高度处
      var translateY = Math.ceil(Math.max(0, (windowHeight - scaledCanvasHeight -
          Runner.config.ARCADE_MODE_INITIAL_TOP_POSITION) *
          Runner.config.ARCADE_MODE_TOP_POSITION_PERCENT)) *
          window.devicePixelRatio;
      this.containerEl.style.transform = 'scale(' + scale + ') translateY(' +
          translateY + 'px)';
    },
    /**
     * 开启街机模式（全屏）
     */
    setArcadeMode: function () {
      document.body.classList.add(Runner.classes.ARCADE_MODE);
      this.setArcadeModeContainerScale();
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

  // ==========================================
  // 工具函数
  // ==========================================

  /**
   * 生成 canvas 元素
   * @param {HTMLElement} container canva 的容器
   * @param {Number} width canvas 的宽度
   * @param {Number} height canvas 的高度
   * @param {String} opt_className 给 canvas 添加的类名（可选）
   * @return {HTMLCanvasElement}
   */
  function createCanvas(container, width, height, opt_className) {
    var canvas = document.createElement('canvas');
    canvas.className = opt_className
      ? opt_className + ' ' + Runner.classes.CANVAS
      : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);

    return canvas;
  }

  // 获取时间戳
  function getTimeStamp() {
    return performance.now();
  }

  /**
   * 获取 [min, max] 之间的随机数
   * @param {Number} min 最小值
   * @param {Number} max 最大值
   * @return {Number}
   */
  function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ==========================================

  /**
   * Horizon 背景类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 雪碧图中的位置
   */
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

  /**
   * 云朵类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的位置信息
   * @param {Number} containerWidth 容器的宽度
   */
  function Cloud(canvas, spritePos, containerWidth) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;

    // 坐标
    this.xPos = containerWidth;
    this.yPos = 0;

    // 该云朵是否需要删除
    this.remove = false;
    // 随机云朵之间的间隙
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
      Cloud.config.MAX_CLOUD_GAP);

    this.init();
  }

  Cloud.config = {
    WIDTH: 46,
    HEIGHT: 14,
    MIN_CLOUD_GAP: 100,   // 云之间的最小间隙
    MAX_CLOUD_GAP: 400,   // 云之间的最大间隙
    MIN_SKY_LEVEL: 71,    // 云的最小高度
    MAX_SKY_LEVEL: 30,    // 云的最大高度
    BG_CLOUD_SPEED: 0.2,  // 云的速度
    CLOUD_FREQUENCY: 0.5, // 云的频率
    MAX_CLOUDS: 6         // 云的最大数量
  };

  Cloud.prototype = {
    init: function () {
      this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
        Cloud.config.MIN_SKY_LEVEL);
      this.draw();
    },
    draw: function () {
      this.ctx.save();

      var sourceWidth = Cloud.config.WIDTH;
      var sourceHeight = Cloud.config.HEIGHT;
      var outputWidth = sourceWidth;
      var outputHeight = sourceHeight;

      this.ctx.drawImage(
        Runner.imageSprite,
        this.spritePos.x, this.spritePos.y,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        outputWidth, outputHeight
      );

      this.ctx.restore();
    },
    update: function (speed) {
      if (!this.remove) {
        this.xPos -= speed;
        this.draw();

        // 云朵移出 canvas，将其删除
        if (!this.isVisible()) {
          this.remove = true;
        }
      }
    },
    // 云朵是否移出 canvas
    isVisible: function () {
      return this.xPos + Cloud.config.WIDTH > 0;
    },
  };

  /**
   * Horizon 背景类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 雪碧图中的位置
   * @param {Object} dimensions 画布的尺寸
   */
  function Horizon(canvas, spritePos, dimensions) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;

    this.dimensions = dimensions;

    // 云的频率
    this.cloudFrequency = Cloud.config.CLOUD_FREQUENCY;

    // 云
    this.clouds = [];
    this.cloudSpeed = Cloud.config.BG_CLOUD_SPEED;

    // 地面
    this.horizonLine = null;

    this.init();
  }

  Horizon.prototype = {
    init: function () {
      this.addCloud();
      this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    },
    update: function (deltaTime, currentSpeed) {
      this.horizonLine.update(deltaTime, currentSpeed);
      this.updateCloud(deltaTime, currentSpeed);
    },
    addCloud: function () {
      this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
        this.dimensions.WIDTH));
    },
    updateCloud: function (deltaTime, speed) {
      var cloudSpeed = Math.ceil(deltaTime * this.cloudSpeed * speed / 1000);
      var numClouds = this.clouds.length;

      if (numClouds) {
        for (var i = numClouds - 1; i >= 0; i--) {
          this.clouds[i].update(cloudSpeed);
        }

        var lastCloud = this.clouds[numClouds - 1];

        // 检查是否需要添加新的云朵
        // 添加云朵的条件：云朵数量少于最大数量、
        // 最后一个云朵后面的空间大于它的间隙、
        // 云朵出现频率符合要求
        if (numClouds < Cloud.config.MAX_CLOUDS &&
          (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
          this.cloudFrequency > Math.random()) {
          this.addCloud();
        }

        // 删除 remove 属性为 true 的云朵
        this.clouds = this.clouds.filter(function (item) {
          return !item.remove;
        });
      } else {
        this.addCloud();
      }
    },
  };

  function Trex() {}

  Trex.config = {
    WIDTH: 44,
  };
})();