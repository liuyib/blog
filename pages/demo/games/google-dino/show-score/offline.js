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

    this.distanceMeter = null;     // 距离计数类
    this.distanceRan = 0;          // 游戏移动距离
    this.highestScore = 0;         // 最高分

    this.time = 0;                         // 时钟计时器
    this.currentSpeed = this.config.SPEED; // 当前的速度

    this.runningTime = 0;    // 游戏运行的时间
    this.msPerFrame = 1000 / FPS; // 每帧的时间

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
    MAX_SPEED: 13,                         // 游戏的最大速度
    ACCELERATION: 0.001,                   // 加速度
    ARCADE_MODE_INITIAL_TOP_POSITION: 35,  // 街机模式时，canvas 距顶部的初始距离
    ARCADE_MODE_TOP_POSITION_PERCENT: 0.1, // 街机模式时，canvas 距页面顶部的距离，占屏幕高度的百分比
    GAP_COEFFICIENT: 0.6,                  // 障碍物间隙系数
    MAX_OBSTACLE_DUPLICATION: 2,           // 障碍物相邻的最大重复数
    CLEAR_TIME: 3000,                      // 游戏开始后，等待三秒再绘制障碍物
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
      CACTUS_SMALL: {x: 228, y: 2}, // 小仙人掌
      CACTUS_LARGE: {x: 332, y: 2}, // 大仙人掌
      PTERODACTYL: {x: 134, y: 2},  // 翼龙
      TEXT_SPRITE: {x: 655, y: 2},  // 文字
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
        this.dimensions, this.config.GAP_COEFFICIENT);

      // 加载距离计数器类 DistanceMeter
      this.distanceMeter = new DistanceMeter(this.canvas,
        this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);

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

        this.gameOver();
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

        this.runningTime += deltaTime;
        var hasObstacles = this.runningTime > this.config.CLEAR_TIME;
        
        // 刚开始 this.playingIntro 不存在 !this.playingIntro 为真
        if (!this.playingIntro) {
          this.playIntro(); // 执行开场动画
        }

        // 直到开场动画结束再移动地面
        if (this.playingIntro) {
          this.horizon.update(0, this.currentSpeed, hasObstacles);
        } else {
          deltaTime = !this.activated ? 0 : deltaTime;
          this.horizon.update(deltaTime, this.currentSpeed, hasObstacles);
        }

        this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

        if (this.currentSpeed < this.config.MAX_SPEED) {
          this.currentSpeed += this.config.ACCELERATION;
        }

        var playAchievementSound = this.distanceMeter.update(deltaTime,
          Math.ceil(this.distanceRan));
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
    // 游戏结束
    gameOver: function () {
      this.stop();

      if (this.distanceRan > this.highestScore) {
        this.highestScore = Math.ceil(this.distanceRan);
        this.distanceMeter.setHighScore(this.highestScore); // 保存最高分
      }

      // 重置时间
      this.time = getTimeStamp();
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
   * 障碍物类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {String} type 障碍物类型
   * @param {Object} spriteImgPos 在雪碧图中的位置
   * @param {Object} dimensions 画布尺寸
   * @param {Number} gapCoefficient 间隙系数
   * @param {Number} speed 速度
   * @param {Number} opt_xOffset x 坐标修正
   */
  function Obstacle(canvas, type, spriteImgPos, dimensions,
    gapCoefficient, speed, opt_xOffset) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.typeConfig = type;               // 障碍物类型
    this.spritePos = spriteImgPos;        // 在雪碧图中的位置
    this.gapCoefficient = gapCoefficient; // 间隔系数
    this.dimensions = dimensions;

    // 每组障碍物的数量（随机 1~3 个）
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);

    this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
    this.yPos = 0;

    this.remove = false;   // 是否可以被删除
    this.gap = 0;          // 间隙
    this.speedOffset = 0;  // 速度修正

    // 非静态障碍物的属性
    this.currentFrame = 0; // 当前动画帧
    this.timer = 0;        // 动画帧切换计时器

    this.init(speed);
  }

  Obstacle.MAX_GAP_COEFFICIENT = 1.5; // 最大间隙系数
  Obstacle.MAX_OBSTACLE_LENGTH = 3;   // 每组障碍物的最大数量

  Obstacle.types = [{
    type: 'CACTUS_SMALL',  // 小仙人掌
    width: 17,
    height: 35,
    yPos: 105,             // 在 canvas 上的 y 坐标
    multipleSpeed: 4,
    minGap: 120,           // 最小间距
    minSpeed: 0,           // 最低速度
  }, {
    type: 'CACTUS_LARGE',  // 大仙人掌
    width: 25,
    height: 50,
    yPos: 90,
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
  }, {
    type: 'PTERODACTYL',   // 翼龙
    width: 46,
    height: 40,
    yPos: [ 100, 75, 50 ], // y 坐标不固定
    multipleSpeed: 999,
    minSpeed: 8.5,
    minGap: 150,
    numFrames: 2,          // 两个动画帧  
    frameRate: 1000 / 6,   // 帧率（一帧的时间）
    speedOffset: 0.8,      // 速度修正
  }];

  Obstacle.prototype = {
    init: function (speed) {
      // 这里是为了确保刚开始游戏速度慢时，不会生成较大的障碍物和翼龙
      // 否则速度慢时，生成较大的障碍物或翼龙是跳不过去的
      if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
        this.size = 1;
      }

      this.width = this.typeConfig.width * this.size;

      // 检查障碍物是否可以被放置在不同的高度
      if (Array.isArray(this.typeConfig.yPos)) {
        var yPosConfig = this.typeConfig.yPos;
        // 随机高度
        this.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
      } else {
        this.yPos = this.typeConfig.yPos;
      }

      this.draw();

      // 对于速度与地面不同的障碍物（翼龙）进行速度修正
      // 使得有的速度看起来快一些，有的看起来慢一些
      if (this.typeConfig.speedOffset) {
        this.speedOffset = Math.random() > 0.5 ? this.typeConfig.speedOffset :
          -this.typeConfig.speedOffset;
      }

      // 障碍物的间隙随游戏速度变化而改变
      this.gap = this.getGap(this.gapCoefficient, speed);
    },
    /**
      * 获取障碍物的间隙
      * @param {Number} gapCoefficient 间隙系数
      * @param {Number} speed 速度
      */
    getGap: function(gapCoefficient, speed) {
      var minGap = Math.round(this.width * speed +
            this.typeConfig.minGap * gapCoefficient);
      var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
      return getRandomNum(minGap, maxGap);
    },
    draw: function () {
      var sourceWidth = this.typeConfig.width;
      var sourceHeight = this.typeConfig.height;

      // 根据每组障碍物的数量计算障碍物在雪碧图上的坐标
      var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1)) +
        this.spritePos.x;

      // 如果存在动画帧，则计算当前动画帧在雪碧图中的坐标
      if (this.currentFrame > 0) {
        sourceX += sourceWidth * this.currentFrame;
      }

      this.ctx.drawImage(
        Runner.imageSprite,
        sourceX, this.spritePos.y,
        sourceWidth * this.size, sourceHeight,
        this.xPos, this.yPos,
        this.typeConfig.width * this.size, this.typeConfig.height
      );
    },
    update: function (deltaTime, speed) {
      if (!this.remove) {
        // 修正速度
        if (this.typeConfig.speedOffset) {
          speed += this.speedOffset;
        }

        this.xPos -= Math.floor((speed * FPS / 1000) * Math.round(deltaTime));

        // 如果有动画帧，则更新
        if (this.typeConfig.numFrames) {
          this.timer += deltaTime;

          if (this.timer >= this.typeConfig.frameRate) {
            // 第一帧 currentFrame 为 0，第二帧 currentFrame 为 1
            this.currentFrame =
              this.currentFrame == this.typeConfig.numFrames - 1 ?
              0 : this.currentFrame + 1;
            this.timer = 0;
          }
        }
        this.draw();

        // 标记移出画布的障碍物
        if (!this.isVisible()) {
          this.remove = true;
        }
      }
    },
    // 障碍物是否还在画布中
    isVisible: function () {
      return this.xPos + this.width > 0;
    },
  };

  /**
   * 记录移动的距离（分数等于移动距离）
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的位置
   * @param {Number} canvasWidth 画布的宽度
   */
  function DistanceMeter(canvas, spritePos, canvasWidth) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.config = DistanceMeter.config;
    this.spritePos = spritePos;

    this.x = 0;               // 分数显示在 canvas 中的 x 坐标
    this.y = 5;

    this.maxScore = 0;        // 游戏分数上限
    this.highScore = [];      // 存储最高分数的每一位数字

    this.digits = [];         // 存储分数的每一位数字
    this.achievement = false; // 是否进行闪动特效
    this.defaultString = '';  // 游戏的默认距离（00000）
    this.flashTimer = 0;      // 动画计时器
    this.flashIterations = 0; // 特效闪动的次数

    this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS; // 分数的最大位数

    this.init(canvasWidth);
  }

  DistanceMeter.config = {
    MAX_DISTANCE_UNITS: 5,          // 分数的最大位数
    ACHIEVEMENT_DISTANCE: 100,      // 每 100 米触发一次闪动特效
    COEFFICIENT: 0.025,             // 将像素距离转换为比例单位的系数
    FLASH_DURATION: 1000 / 4,       // 一闪的时间（一次闪动分别两闪：从有到无，从无到有）
    FLASH_ITERATIONS: 3,            // 闪动的次数
  };

  DistanceMeter.dimensions = {
    WIDTH: 10,
    HEIGHT: 13,
    DEST_WIDTH: 11, // 加上间隔后每个数字的宽度
  };

  DistanceMeter.prototype = {
    init: function (width) {
      var maxDistanceStr = '';     // 游戏的最大距离

      this.calcXPos(width);        // 计算分数显示在 canvas 中的 x 坐标

      for (var i = 0; i < this.maxScoreUnits; i++) {
        this.draw(i, 0);           // 第一次游戏，不绘制最高分
        this.defaultString += '0'; // 默认初始分数 00000
        maxDistanceStr += '9';     // 默认最大分数 99999
      }

      this.maxScore = parseInt(maxDistanceStr);
    },
    calcXPos: function (canvasWidth) {
      this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
        (this.maxScoreUnits + 1));
    },
    /**
      * 将分数绘制到 canvas 上
      * @param {Number} digitPos 数字在分数中的位置
      * @param {Number} value 数字的具体值（0-9）
      * @param {Boolean} opt_highScore 是否显示最高分
      */
    draw: function (digitPos, value, opt_highScore) {
      // 在雪碧图中的坐标
      var sourceX = this.spritePos.x + DistanceMeter.dimensions.WIDTH * value;
      var sourceY = this.spritePos.y + 0;
      var sourceWidth = DistanceMeter.dimensions.WIDTH;
      var sourceHeight = DistanceMeter.dimensions.HEIGHT;

      // 绘制到 canvas 时的坐标
      var targetX = digitPos * DistanceMeter.dimensions.DEST_WIDTH;
      var targetY = this.y;
      var targetWidth = DistanceMeter.dimensions.WIDTH;
      var targetHeight = DistanceMeter.dimensions.HEIGHT;

      this.ctx.save();

      if (opt_highScore) { // 显示最高分
        var hightScoreX = this.x - (this.maxScoreUnits * 2) *
          DistanceMeter.dimensions.WIDTH;

        this.ctx.translate(hightScoreX, this.y);
      } else {            // 不显示最高分
        this.ctx.translate(this.x, this.y);
      }

      this.ctx.drawImage(
        Runner.imageSprite,
        sourceX, sourceY,
        sourceWidth, sourceHeight,
        targetX, targetY,
        targetWidth, targetHeight
      );

      this.ctx.restore();
    },
    /**
      * 将游戏移动的像素距离转换为真实的距离
      * @param {Number} distance 游戏移动的像素距离
      */
    getActualDistance: function (distance) {
      return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
    },
    update: function (deltaTime, distance) {
      var paint = true;      // 是否绘制分数
      var playSound = false; // 是否播放音效

      // 没有进行闪动特效
      if (!this.achievement) {
        distance = this.getActualDistance(distance);

        // 分数超出上限时，上限增加一位数。超出上限两位数时，分数置零
        if (distance > this.maxScore &&
          this.maxScoreUnits === this.config.MAX_DISTANCE_UNITS) {
          this.maxScoreUnits++;
          this.maxScore = parseInt(this.maxScore + '9');
        } else {
          this.distance = 0;
        }

        if (distance > 0) {
          // 触发闪动特效
          if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
            this.achievement = true;
            this.flashTimer = 0;
            playSound = true;
          }

          // 分数前面补零来凑位数
          var distanceStr = (this.defaultString + distance).substr(-this.maxScoreUnits);
          this.digits = distanceStr.split('');
        } else {
          // 将默认分数 00000 中的每一位数字存到数组中
          this.digits = this.defaultString.split('');
        }
      } else {
        // 控制特效的闪动次数
        if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
          this.flashTimer += deltaTime;

          // 第一闪不绘制数字
          if (this.flashTimer < this.config.FLASH_DURATION) {
            paint = false;
          }
          // 进行了两闪，闪动次数加一
          else if (this.flashTimer > this.config.FLASH_DURATION * 2) {
            this.flashTimer = 0;
            this.flashIterations++;
          }
        } else { // 闪动特效结束
          this.achievement = false;
          this.flashIterations = 0;
          this.flashTimer = 0;
        }
      }

      // 绘制当前分
      if (paint) {
        for (var i = this.digits.length - 1; i >= 0; i--) {
          this.draw(i, parseInt(this.digits[i]));
        }
      }

      // 绘制最高分
      this.drawHighScore();
      return playSound;
    },
    drawHighScore: function () {
      this.ctx.save();
      this.ctx.globalAlpha = 0.8;

      for (var i = this.highScore.length - 1; i >= 0; i--) {
        this.draw(i, parseInt(this.highScore[i], 10), true);
      }
      this.ctx.restore();
    },
    /**
      * 将游戏的最高分数存入数组
      * @param {Number} distance 游戏移动的像素距离
      */
    setHighScore: function (distance) {
      distance = this.getActualDistance(distance);
      var highScoreStr = (this.defaultString
        + distance).substr(-this.maxScoreUnits);

      // 分数前面字母 H、I 在雪碧图中位于数字后面，也就是第 10、11 位置
      this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
    },
  };

  /**
   * Horizon 背景类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 雪碧图中的位置
   * @param {Object} dimensions 画布的尺寸
   * @param {Number} gapCoefficient 间隔系数
   */
  function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;

    this.obstacles = [];       // 存储障碍物
    this.obstacleHistory = []; // 记录存储的障碍物的类型

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
    update: function (deltaTime, currentSpeed, updateObstacles) {
      this.horizonLine.update(deltaTime, currentSpeed);
      this.updateCloud(deltaTime, currentSpeed);

      if (updateObstacles) {
        this.updateObstacles(deltaTime, currentSpeed);
      }
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
    updateObstacles: function (deltaTime, currentSpeed) {
      // 复制存储的障碍物
      var updatedObstacles = this.obstacles.slice(0);

      for (var i = 0; i < this.obstacles.length; i++) {
        var obstacle = this.obstacles[i];
        obstacle.update(deltaTime, currentSpeed);

        // 删除被标记的障碍物
        if (obstacle.remove) {
          updatedObstacles.shift();
        }
      }

      // 更新存储的障碍物
      this.obstacles = updatedObstacles;

      if (this.obstacles.length > 0) {
        var lastObstacle = this.obstacles[this.obstacles.length - 1];

        // 满足添加障碍物的条件
        if (lastObstacle && !lastObstacle.followingObstacleCreated &&
            lastObstacle.isVisible() &&
            (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
            this.dimensions.WIDTH) {
          this.addNewObstacle(currentSpeed);
          lastObstacle.followingObstacleCreated = true;
        }
      } else { // 没有存储障碍物，直接添加
        this.addNewObstacle(currentSpeed);
      }
    },
    addNewObstacle: function(currentSpeed) {
      // 随机障碍物
      var obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
      var obstacleType = Obstacle.types[obstacleTypeIndex];

      // 检查当前添加的障碍物与前面障碍物的重复次数是否符合要求
      // 如果当前的速度小于障碍物的速度，证明障碍物是翼龙（其他障碍物速度都是 0）
      // 添加的障碍物是翼龙，并且当前速度小于翼龙的速度，则重新添加（保证低速不出现翼龙）
      if (this.duplicateObstacleCheck(obstacleType.type) ||
          currentSpeed < obstacleType.minSpeed) {
        this.addNewObstacle(currentSpeed);
      } else {
        // 通过检查后，存储新添加的障碍物
        var obstacleSpritePos = this.spritePos[obstacleType.type];

        // 存储障碍物
        this.obstacles.push(new Obstacle(this.canvas, obstacleType,
            obstacleSpritePos, this.dimensions,
            this.gapCoefficient, currentSpeed, obstacleType.width));

        // 存储障碍物类型
        this.obstacleHistory.unshift(obstacleType.type);

        // 若 history 数组长度大于 1， 清空最前面两个数据
        if (this.obstacleHistory.length > 1) {
          this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
        }
      }
    },
    /**
      * 检查当前障碍物前面的障碍物的重复次数是否大于等于最大重复次数
      * @param {String} nextObstacleType 障碍物类型
      */
    duplicateObstacleCheck: function(nextObstacleType) {
      var duplicateCount = 0; // 重复次数

      // 根据存储的障碍物类型来判断障碍物的重复次数
      for (var i = 0; i < this.obstacleHistory.length; i++) {
        duplicateCount = this.obstacleHistory[i] == nextObstacleType ?
            duplicateCount + 1 : 0;
      }
      return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION;
    },
  };

  function Trex() {}

  Trex.config = {
    WIDTH: 44,
  };
})();