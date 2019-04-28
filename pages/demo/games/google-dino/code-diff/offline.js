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

    this.distanceMeter = null;             // 距离计数类
    this.distanceRan = 0;                  // 游戏移动距离
    this.highestScore = 0;                 // 最高分

    this.tRex = null; // 小恐龙
  
    this.time = 0;                         // 时钟计时器
    this.currentSpeed = this.config.SPEED; // 当前的速度

    this.runningTime = 0;                  // 游戏运行的时间
    this.msPerFrame = 1000 / FPS;          // 每帧的时间

    this.inverted = false;                 // 是否开启夜晚模式
    this.invertTimer = 0;                  // 夜晚模式的时间

    this.activated  = false;               // 游戏彩蛋是否被激活（没有被激活时，游戏不会显示出来）
    this.playing = false;                  // 游戏是否进行中
    this.crashed = false;                  // 小恐龙是否碰到了障碍物
    this.paused = false                    // 游戏是否暂停

    this.soundFx = {};        // 存储音频数据
    this.audioContext = null; // 音频上下文
  
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
    INVERT_FADE_DURATION: 12000,           // 夜晚模式的持续时间
    INVERT_DISTANCE: 700,                  // 触发夜晚模式的距离
    BOTTOM_PAD: 10,                        // 小恐龙距 canvas 底部的距离
    MAX_BLINK_COUNT: 3,                    // 小恐龙的最大眨眼次数
    GAMEOVER_CLEAR_TIME: 750,              // 游戏结束后，允许使用跳跃键重新开始游戏的最短时间
    RESOURCE_TEMPLATE_ID: 'audio-resources', // 音频元素父元素 template 的 ID
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
    INVERTED: 'inverted',
  };
  
  // 雪碧图中图片的坐标信息
  Runner.spriteDefinition = {
    LDPI: {
      HORIZON: { x: 2, y: 54 },     // 地面
      CLOUD: {x: 86, y: 2},
      CACTUS_SMALL: {x: 228, y: 2}, // 小仙人掌
      CACTUS_LARGE: {x: 332, y: 2}, // 大仙人掌
      PTERODACTYL: {x: 134, y: 2},  // 翼龙
      TEXT_SPRITE: {x: 655, y: 2},  // 文字
      RESTART: {x: 2, y: 2},        // 重置游戏按钮
      MOON: {x: 484, y: 2},
      STAR: {x: 645, y: 2},
      TREX: {x: 848, y: 2},         // 小恐龙
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

  // 音频元素的 ID
  Runner.sounds = {
    BUTTON_PRESS: 'offline-sound-press',
    HIT: 'offline-sound-hit',
    SCORE: 'offline-sound-reached'
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
      
      // 加载小恐龙类
      this.tRex = new Trex(this.canvas, this.spriteDef.TREX);
  
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
    // 加载音频文件
    loadSounds: function () {
      this.audioContext = new AudioContext();

      var resourceTemplate =
        document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

      for (var sound in Runner.sounds) {
        var soundSrc =
          resourceTemplate.getElementById(Runner.sounds[sound]).src;
        soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
        var buffer = decodeBase64ToArrayBuffer(soundSrc);

        // 异步，不能保证数组中元素的顺序
        this.audioContext.decodeAudioData(buffer, function (index, audioData) {
          // 存储音频数据
          this.soundFx[index] = audioData;
        }.bind(this, sound));
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
        this.tRex.playingIntro = true; // 小恐龙执行开场动画

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
        this.restart();
      }
    },
    /**
     * 更新游戏为开始状态
     */
    startGame: function () {
      this.setArcadeMode();      // 进入街机模式
      
      this.playingIntro = false; // 开场动画结束
      this.tRex.playingIntro = false; // 小恐龙的开场动画结束
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
        this.tRex.reset();
      }
    },
    stop: function () {
      this.setPlayStatus(false);
      this.paused = true;
      cancelAnimationFrame(this.raqId);
      this.raqId = 0;
    },
    /**
     * 播放音频
     * @param {SoundBuffer} 音频的 Buffer
     */
    playSound: function (soundBuffer) {
      if (soundBuffer) {
        var sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = soundBuffer;
        sourceNode.connect(this.audioContext.destination);
        sourceNode.start(0);
      }
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

        if (this.tRex.jumping) {
          this.tRex.updateJump(deltaTime);
        }

        this.runningTime += deltaTime;
        var hasObstacles = this.runningTime > this.config.CLEAR_TIME;
        
        // 刚开始 this.playingIntro 未定义 !this.playingIntro 为真
        if (this.tRex.jumpCount == 1 && !this.playingIntro) {
          this.playIntro(); // 执行开场动画
        }

        // 直到开场动画结束再移动地面
        if (this.playingIntro) {
          this.horizon.update(0, this.currentSpeed, hasObstacles);
        } else {
          deltaTime = !this.activated ? 0 : deltaTime;
          this.horizon.update(deltaTime, this.currentSpeed, hasObstacles,
            this.inverted);
        }

        // 碰撞检测
        var collision = hasObstacles &&
          checkForCollision(this.horizon.obstacles[0], this.tRex);

        if (!collision) {
          this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

          if (this.currentSpeed < this.config.MAX_SPEED) {
            this.currentSpeed += this.config.ACCELERATION;
          }
        } else {
          this.gameOver();
        }

        var playAchievementSound = this.distanceMeter.update(deltaTime,
          Math.ceil(this.distanceRan));

        if (playAchievementSound) {
          this.playSound(this.soundFx.SCORE);
        }

        // 夜晚模式
        if (this.invertTimer > this.config.INVERT_FADE_DURATION) { // 夜晚模式结束
          this.invertTimer = 0;
          this.invertTrigger = false;
          this.invert();
        } else if (this.invertTimer) { // 处于夜晚模式，更新其时间
          this.invertTimer += deltaTime;
        } else { // 还没进入夜晚模式
          // 游戏移动的距离
          var actualDistance =
            this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

          if(actualDistance > 0) {
            // 每移动指定距离就触发一次夜晚模式
            this.invertTrigger = !(actualDistance % this.config.INVERT_DISTANCE);

            if (this.invertTrigger && this.invertTimer === 0) {
              this.invertTimer += deltaTime;
              this.invert();
            }
          }
        }
      }

      // 游戏变为开始状态或小恐龙还没有眨三次眼
      if (this.playing || (!this.activated &&
        this.tRex.blinkCount < Runner.config.MAX_BLINK_COUNT)) {
        this.tRex.update(deltaTime);
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
      this.playSound(this.soundFx.HIT);

      this.stop();
      this.crashed = true;                    // 小恐龙撞到了障碍物
      this.distanceMeter.achievement = false; // 结束分数闪动特效

      // 更新小恐龙为碰撞状态
      this.tRex.update(100, Trex.status.CRASHED);

      // 绘制游戏结束面板
      if (!this.gameOverPanel) {
        this.gameOverPanel = new GameOverPanel(this.canvas,
          this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
          this.dimensions);
      } else {
        this.gameOverPanel.draw();
      }

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
    /**
     * 反转当前页面的颜色
     * @param {Boolea} reset 是否重置颜色
     */
    invert: function (reset) {
      var bodyElem = document.body;

      if (reset) {
        bodyElem.classList.toggle(Runner.classes.INVERTED, false); // 删除 className

        this.invertTimer = 0;  // 重置夜晚模式的时间
        this.inverted = false; // 关闭夜晚模式
      } else {
        this.inverted = bodyElem.classList.toggle(Runner.classes.INVERTED,
          this.invertTrigger);
      }
    },
    // 用来处理 EventTarget（这里就是 Runner 类） 上发生的事件
    // 当事件被发送到 EventListener 时，浏览器就会自动调用这个方法
    handleEvent: function (e) {
      return (function (eType, events) {
        switch (eType) {
          case events.KEYDOWN:
            this.onKeyDown(e);
            break;
          case events.KEYUP:
            this.onKeyUp(e);
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
            this.loadSounds();
            this.setPlayStatus(true);
            this.update();
          }

          // 开始跳跃
          if (!this.tRex.jumping && !this.tRex.ducking) {
            this.playSound(this.soundFx.BUTTON_PRESS);
            this.tRex.startJump(this.currentSpeed);
          }
        } else if (this.playing && Runner.keyCodes.DUCK[e.keyCode]) {
          e.preventDefault();

          if (this.tRex.jumping) {
            this.tRex.setSpeedDrop(); // 加速下落
          } else if (!this.tRex.jumping && !this.tRex.ducking) {
            this.tRex.setDuck(true);  // 进入躲闪状态
          }
        }
      }      
    },
    onKeyUp: function(e) {
      var keyCode = String(e.keyCode);
      var isjumpKey = Runner.keyCodes.JUMP[keyCode];
  
      if (this.isRunning() && isjumpKey) {        // 跳跃
        this.tRex.endJump();
      } else if (Runner.keyCodes.DUCK[keyCode]) { // 躲避状态
        this.tRex.speedDrop = false;
        this.tRex.setDuck(false);
      } else if (this.crashed) {
        var deltaTime = getTimeStamp() - this.time;
  
        // 按下回车键或者等待 750 毫秒后，按下空格键，重新开始游戏
        if (Runner.keyCodes.RESTART[keyCode] ||
            (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
            Runner.keyCodes.JUMP[keyCode])) {
          this.restart();
        }
      }
    },
    // 是否游戏正在进行
    isRunning: function() {
      return !!this.raqId;
    },
    setPlayStatus: function (isPlaying) {
      this.playing = isPlaying;
    },
    // 重新开始游戏
    restart: function() {
      if (!this.raqId) {
        this.runningTime = 0;
        this.setPlayStatus(true);
        this.paused = false;
        this.crashed = false;
        this.distanceRan = 0;
        this.currentSpeed = this.config.SPEED;
        this.time = getTimeStamp();
        this.clearCanvas();
        this.distanceMeter.reset();
        this.horizon.reset();
        this.tRex.reset();
        this.playSound(this.soundFx.BUTTON_PRESS);
        this.invert(true);
        this.update();
      }
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

  /**
   * 将 base64编码转为 ArrayBuffer
   * @param {String} base64String Base64 字符串
   */
  function decodeBase64ToArrayBuffer(base64String) {
    var len = (base64String.length / 4) * 3;
    var str = atob(base64String);
    var arrayBuffer = new ArrayBuffer(len);
    var bytes = new Uint8Array(arrayBuffer);

    for (var i = 0; i < len; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  // ==========================================

  /**
   * 游戏结束面板类
   * @param {HTMLCanvasElement} 画布元素
   * @param {Object} textImgPos 文字 "Game Over" 在雪碧图中的位置
   * @param {Object} restartImgPos 重置按钮在雪碧图中的位置
   * @param {!Object} dimensions 游戏画布的尺寸
   */
  function GameOverPanel(canvas, textImgPos, restartImgPos, dimensions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvasDimensions = dimensions;
    this.textImgPos = textImgPos;
    this.restartImgPos = restartImgPos;

    this.draw();
  };

  // 配置参数
  GameOverPanel.dimensions = {
    TEXT_X: 0,          // 文字 "Game Over" 的 x 坐标
    TEXT_Y: 13,
    TEXT_WIDTH: 191,    // 文字 "Game Over" 的宽度
    TEXT_HEIGHT: 11,
    RESTART_WIDTH: 36,  // 重置按钮的宽度
    RESTART_HEIGHT: 32,
  };

  GameOverPanel.prototype = {
    draw: function() {
      var dimensions = GameOverPanel.dimensions;
      var centerX = this.canvasDimensions.WIDTH / 2;
  
      // 文字 "Game Over"
      var textSourceX = dimensions.TEXT_X;
      var textSourceY = dimensions.TEXT_Y;
      var textSourceWidth = dimensions.TEXT_WIDTH;
      var textSourceHeight = dimensions.TEXT_HEIGHT;
  
      var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
      var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
      var textTargetWidth = dimensions.TEXT_WIDTH;
      var textTargetHeight = dimensions.TEXT_HEIGHT;
  
      // 重置按钮
      var restartSourceWidth = dimensions.RESTART_WIDTH;
      var restartSourceHeight = dimensions.RESTART_HEIGHT;
      var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
      var restartTargetY = this.canvasDimensions.HEIGHT / 2;
  
      textSourceX += this.textImgPos.x;
      textSourceY += this.textImgPos.y;
  
      // 文字 "Game over"
      this.ctx.drawImage(Runner.imageSprite,
        textSourceX, textSourceY, textSourceWidth, textSourceHeight,
        textTargetX, textTargetY, textTargetWidth, textTargetHeight);
  
      // 重置按钮
      this.ctx.drawImage(Runner.imageSprite,
        this.restartImgPos.x, this.restartImgPos.y,
        restartSourceWidth, restartSourceHeight,
        restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
        dimensions.RESTART_HEIGHT);
    }
  };

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
    reset: function() {
      this.xPos[0] = 0;
      this.xPos[1] = HorizonLine.dimensions.WIDTH;
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
   * 检测盒子是否碰撞
   * @param {Object} obstacle 障碍物
   * @param {Object} tRex 小恐龙
   * @param {HTMLCanvasContext} opt_canvasCtx 画布上下文
   */
  function checkForCollision(obstacle, tRex, opt_canvasCtx) {
    // 调整碰撞盒子的边界，因为小恐龙和障碍物有 1 像素的白边
    var tRexBox = new CollisionBox(     // 小恐龙最外层的碰撞盒子
        tRex.xPos + 1,
        tRex.yPos + 1,
        tRex.config.WIDTH - 2,
        tRex.config.HEIGHT - 2);

    var obstacleBox = new CollisionBox( // 障碍物最外层的碰撞盒子
        obstacle.xPos + 1,
        obstacle.yPos + 1,
        obstacle.typeConfig.width * obstacle.size - 2,
        obstacle.typeConfig.height - 2);

    // 绘制调试边框
    if (opt_canvasCtx) {
      drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
    }

    // 检查最外层的盒子是否碰撞
    if (boxCompare(tRexBox, obstacleBox)) {
      var collisionBoxes = obstacle.collisionBoxes;

      // 小恐龙有两种碰撞盒子，分别对应小恐龙站立状态和低头状态
      var tRexCollisionBoxes = tRex.ducking ?
          Trex.collisionBoxes.DUCKING : Trex.collisionBoxes.RUNNING;

      // 检测里面小的盒子是否碰撞
      for (var t = 0; t < tRexCollisionBoxes.length; t++) {
        for (var i = 0; i < collisionBoxes.length; i++) {
          // 调整碰撞盒子的实际位置（除去小恐龙和障碍物上 1 像素的白边）
          var adjTrexBox =
              createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
          var adjObstacleBox =
              createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
          var crashed = boxCompare(adjTrexBox, adjObstacleBox);

          // 绘制调试边框
          if (opt_canvasCtx) {
            drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
          }

          if (crashed) {
            return [adjTrexBox, adjObstacleBox];
          }
        }
      }
    }
    return false;
  };

  /**
   * 调整碰撞盒子
   * @param {!CollisionBox} box 原始的盒子
   * @param {!CollisionBox} adjustment 要调整成的盒子
   * @return {CollisionBox} 被调整的盒子对象
   */
  function createAdjustedCollisionBox(box, adjustment) {
    return new CollisionBox(
      box.x + adjustment.x,
      box.y + adjustment.y,
      box.width,
      box.height);
  };

  /**
   * 绘制碰撞盒子的边框
   * @param {HTMLCanvasContext} canvasCtx canvas 上下文
   * @param {CollisionBox} tRexBox 小恐龙的碰撞盒子
   * @param {CollisionBox} obstacleBox 障碍物的碰撞盒子
   */
  function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f00';
    canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

    canvasCtx.strokeStyle = '#0f0';
    canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
        obstacleBox.width, obstacleBox.height);
    canvasCtx.restore();
  };

  /**
   * 比较两个矩形是否相交
   * @param {CollisionBox} tRexBox 小恐龙的碰撞盒子
   * @param {CollisionBox} obstacleBox 障碍物的碰撞盒子
   */
  function boxCompare(tRexBox, obstacleBox) {
    var crashed = false;

    // 两个矩形相交
    if (tRexBox.x < obstacleBox.x + obstacleBox.width &&
        tRexBox.x + tRexBox.width > obstacleBox.x &&
        tRexBox.y < obstacleBox.y + obstacleBox.height &&
        tRexBox.height + tRexBox.y > obstacleBox.y) {
      crashed = true;
    }

    return crashed;
  };

  /**
   * 用于生成碰撞盒子
   * @param {Number} x X 坐标
   * @param {Number} y Y坐标
   * @param {Number} w 宽度
   * @param {Number} h 高度
   */
  function CollisionBox(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
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
    this.collisionBoxes = []; // 存储碰撞盒子
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
    collisionBoxes: [      // 碰撞盒子
      new CollisionBox(0, 7, 5, 27),
      new CollisionBox(4, 0, 6, 34),
      new CollisionBox(10, 4, 7, 14),
    ],
  }, {
    type: 'CACTUS_LARGE',  // 大仙人掌
    width: 25,
    height: 50,
    yPos: 90,
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [      // 碰撞盒子
      new CollisionBox(0, 12, 7, 38),
      new CollisionBox(8, 0, 7, 49),
      new CollisionBox(13, 10, 10, 38),
    ],
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
    collisionBoxes: [      // 碰撞盒子
      new CollisionBox(15, 15, 16, 5),
      new CollisionBox(18, 21, 24, 6),
      new CollisionBox(2, 14, 4, 3),
      new CollisionBox(6, 10, 4, 7),
      new CollisionBox(10, 8, 6, 9),
    ],
  }];

  Obstacle.prototype = {
    init: function (speed) {
      this.cloneCollisionBoxes(); 

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

      // 调整中间的碰撞盒子的大小
      //      ____        ______        ________
      //    _|   |-|    _|     |-|    _|       |-|
      //   | |<->| |   | |<--->| |   | |<----->| |
      //   | | 1 | |   | |  2  | |   | |   3   | |
      //   |_|___|_|   |_|_____|_|   |_|_______|_|
      //
      if (this.size > 1) {
        this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
            this.collisionBoxes[2].width;
        this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
      }
      
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
    // 复制碰撞盒子
    cloneCollisionBoxes: function() {
      var collisionBoxes = this.typeConfig.collisionBoxes;

      for (var i = collisionBoxes.length - 1; i >= 0; i--) {
        this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
          collisionBoxes[i].y, collisionBoxes[i].width,
          collisionBoxes[i].height);
      }
    },
  };

  /**
   * 小恐龙类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的坐标
   */
  function Trex(canvas, spritePos) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.spritePos = spritePos;

    this.xPos = 0;
    this.yPos = 0;
    this.groundYPos = 0;               // 小恐龙在地面上时的 y 坐标

    this.currentFrame = 0;             // 当前的动画帧
    this.currentAnimFrames = [];       // 存储当前状态的动画帧在雪碧图中的 x 坐标
    this.blinkDelay = 0;               // 眨眼间隔的时间（随 机）
    this.blinkCount = 0;               // 眨眼次数
    this.animStartTime = 0;            // 小恐龙眨眼动画开始时间
    this.timer = 0;                    // 计时器
    this.msPerFrame = 1000 / FPS;      // 帧率
    this.status = Trex.status.WAITING; // 当前的状态
    this.config = Trex.config;

    this.jumping = false;              // 是否跳跃
    this.ducking = false;              // 是否闪避（俯身）
    this.jumpVelocity = 0;             // 跳跃的速度
    this.reachedMinHeight = false;     // 是否达到最低高度
    this.speedDrop = false;            // 是否加速下降
    this.jumpCount = 0;                // 跳跃的次数
    this.jumpspotX = 0;                // 跳跃点的 x 坐标

    this.init();
  }

  Trex.config = {
    GRAVITY: 0.6,               // 引力
    WIDTH: 44,                  // 站立时的宽度
    HEIGHT: 47,
    WIDTH_DUCK: 59,             // 俯身时的宽度
    HEIGHT_DUCK: 25,
    MAX_JUMP_HEIGHT: 30,        // 最大跳跃高度
    MIN_JUMP_HEIGHT: 30,        // 最小跳跃高度
    SPRITE_WIDTH: 262,          // 站立的小恐龙在雪碧图中的总宽度
    DROP_VELOCITY: -5,          // 下落的速度
    INITIAL_JUMP_VELOCITY: -10, // 初始跳跃速度
    SPEED_DROP_COEFFICIENT: 3,  // 下落时的加速系数（越大下落的越快）
    INTRO_DURATION: 1500,       // 开场动画的时间
    START_X_POS: 50,            // 开场动画结束后，小恐龙在 canvas 上的 x 坐标
  };
  
  Trex.BLINK_TIMING = 7000;     // 眨眼最大间隔的时间

  // 小恐龙的碰撞盒子
  Trex.collisionBoxes = {
    DUCKING: [
      new CollisionBox(1, 18, 55, 25)
    ],
    RUNNING: [
      new CollisionBox(22, 0, 17, 16),
      new CollisionBox(1, 18, 30, 9),
      new CollisionBox(10, 35, 14, 8),
      new CollisionBox(1, 24, 29, 5),
      new CollisionBox(5, 30, 21, 4),
      new CollisionBox(9, 34, 15, 4)
    ]
  };
  
  // 小恐龙的状态
  Trex.status = {
    CRASHED: 'CRASHED', // 撞到障碍物
    DUCKING: 'DUCKING', // 正在闪避（俯身）
    JUMPING: 'JUMPING', // 正在跳跃
    RUNNING: 'RUNNING', // 正在奔跑
    WAITING: 'WAITING', // 正在等待（未开始游戏）
  };
  
  // 为不同的状态配置不同的动画帧
  Trex.animFrames = {
    WAITING: {
      frames: [44, 0],
      msPerFrame: 1000 / 3
    },
    RUNNING: {
      frames: [88, 132],
      msPerFrame: 1000 / 12
    },
    CRASHED: {
      frames: [220],
      msPerFrame: 1000 / 60
    },
    JUMPING: {
      frames: [0],
      msPerFrame: 1000 / 60
    },
    DUCKING: {
      frames: [264, 323],
      msPerFrame: 1000 / 8
    },
  };

  Trex.prototype = {
    init: function() {
      // 获取小恐龙站在地面上时的 y 坐标
      this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
          Runner.config.BOTTOM_PAD;
      this.yPos = this.groundYPos; // 小恐龙的 y 坐标初始化
      // 最低跳跃高度
      this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
  
      this.draw(0, 0);             // 绘制小恐龙的第一帧图片
      this.update(0, Trex.status.WAITING); // 初始为等待状态
    },
    /**
     * 绘制小恐龙
     * @param {Number} x 当前帧相对于第一帧的 x 坐标
     * @param {Number} y 当前帧相对于第一帧的 y 坐标
     */
    draw: function(x, y) {
      // 在雪碧图中的坐标
      var sourceX = x + this.spritePos.x;
      var sourceY = y + this.spritePos.y;
  
      // 在雪碧图中的宽高
      var sourceWidth = this.ducking && this.status != Trex.status.CRASHED ?
          this.config.WIDTH_DUCK : this.config.WIDTH;
      var sourceHeight = this.config.HEIGHT;
  
      // 绘制到 canvas 上时的高度
      var outputHeight = sourceHeight;
  
      // 躲避状态.
      if (this.ducking && this.status != Trex.status.CRASHED) {
        this.ctx.drawImage(
          Runner.imageSprite,
          sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH_DUCK, outputHeight
        );
      } else {
        // 躲闪状态下撞到障碍物
        if (this.ducking && this.status == Trex.status.CRASHED) {
          this.xPos++;
        }
        // 奔跑状态
        this.ctx.drawImage(
          Runner.imageSprite,
          sourceX, sourceY,
          sourceWidth, sourceHeight,
          this.xPos, this.yPos,
          this.config.WIDTH, outputHeight
        );
      }
  
      this.ctx.globalAlpha = 1;
    },
    /**
     * 更新小恐龙
     * @param {Number} deltaTime 间隔时间
     * @param {String} opt_status 小恐龙的状态
     */
    update: function(deltaTime, opt_status) {
      this.timer += deltaTime;

      // 更新状态的参数
      if (opt_status) {
        this.status = opt_status;
        this.currentFrame = 0;
        this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
        this.currentAnimFrames = Trex.animFrames[opt_status].frames;

        if (opt_status == Trex.status.WAITING) {
          this.animStartTime = getTimeStamp(); // 设置眨眼动画开始的时间
          this.setBlinkDelay();                // 设置眨眼间隔的时间
        }
      }

      // 正在执行开场动画，将小恐龙向右移动 50 像素
      if (this.playingIntro && this.xPos < this.config.START_X_POS) {
        this.xPos += Math.round((this.config.START_X_POS /
          this.config.INTRO_DURATION) * deltaTime);
      }

      if (this.status == Trex.status.WAITING) {
        // 小恐龙眨眼
        this.blink(getTimeStamp());
      } else {
        // 绘制动画帧
        this.draw(this.currentAnimFrames[this.currentFrame], 0);
      }

      if (this.timer >= this.msPerFrame) {
        // 更新当前动画帧，如果处于最后一帧就更新为第一帧，否则更新为下一帧
        this.currentFrame = this.currentFrame ==
          this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
        // 重置计时器
        this.timer = 0;
      }
    },
    // 设置眨眼间隔的时间
    setBlinkDelay: function() {
      this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
    },
    // 小恐龙眨眼
    blink: function (time) {
      var deltaTime = time - this.animStartTime;
      
      // 间隔时间大于随机获取的眨眼间隔时间才能眨眼
      if (deltaTime >= this.blinkDelay) {
        this.draw(this.currentAnimFrames[this.currentFrame], 0);
        
        // 正在眨眼
        if (this.currentFrame == 1) {
          console.log('眨眼');
          this.setBlinkDelay();      // 重新设置眨眼间隔的时间
          this.animStartTime = time; // 更新眨眼动画开始的时间
          this.blinkCount++;         // 眨眼次数加一
        }
      }
    },
    // 开始跳跃
    startJump: function(speed) {
      if (!this.jumping) {
        // 更新小恐龙为跳跃状态 
        this.update(0, Trex.status.JUMPING);
        
        // 根据游戏的速度调整跳跃的速度
        this.jumpVelocity = this.config.INITIAL_JUMP_VELOCITY - (speed / 10);
        
        this.jumping = true;
        this.reachedMinHeight = false;
        this.speedDrop = false;
      }
    },
    // 更新小恐龙跳跃时的动画帧
    updateJump: function(deltaTime) {
      var msPerFrame = Trex.animFrames[this.status].msPerFrame; // 获取当前状态的帧率
      var framesElapsed = deltaTime / msPerFrame;

      // 加速下落
      if (this.speedDrop) {
        this.yPos += Math.round(this.jumpVelocity *
          this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
      } else {
        this.yPos += Math.round(this.jumpVelocity * framesElapsed);
      }

      // 跳跃的速度受重力的影响，向上逐渐减小，然后反向
      this.jumpVelocity += this.config.GRAVITY * framesElapsed;

      // 达到了最低允许的跳跃高度
      if (this.yPos < this.minJumpHeight || this.speedDrop) {
        this.reachedMinHeight = true;
      }

      // 达到了最高允许的跳跃高度
      if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
        this.endJump(); // 结束跳跃
      }

      // 重新回到地面，跳跃完成
      if (this.yPos > this.groundYPos) {
        this.reset();     // 重置小恐龙的状态
        this.jumpCount++; // 跳跃次数加一
      }
    },
    // 跳跃结束
    endJump: function() {
      if (this.reachedMinHeight &&
          this.jumpVelocity < this.config.DROP_VELOCITY) {
        this.jumpVelocity = this.config.DROP_VELOCITY; // 下落速度重置为默认
      }
    },
    // 重置小恐龙状态
    reset: function() {
      this.yPos = this.groundYPos;
      this.jumpVelocity = 0;
      this.jumping = false;
      this.ducking = false;
      this.update(0, Trex.status.RUNNING);
      this.speedDrop = false;
      this.jumpCount = 0;
    },
    // 设置小恐龙为加速下落，立即取消当前的跳跃
    setSpeedDrop: function() {
      this.speedDrop = true;
      this.jumpVelocity = 1;
    },
    // 设置小恐龙奔跑时是否躲闪
    setDuck: function(isDucking) {
      if (isDucking && this.status != Trex.status.DUCKING) { // 躲闪状态
        this.update(0, Trex.status.DUCKING);
        this.ducking = true;
      } else if (this.status == Trex.status.DUCKING) {       // 奔跑状态
        this.update(0, Trex.status.RUNNING);
        this.ducking = false;
      }
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
    // 重置当前分数为 '00000'
    reset: function() {
      this.update(0);
      this.achievement = false;
    }
  };

  /**
   * 夜晚模式
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 雪碧图中的坐标信息
   * @param {Number} containerWidth 容器宽度
   */
  function NightMode(canvas, spritePos, containerWidth) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
  
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
  
    this.xPos = containerWidth - 50; // 月亮的 x 坐标
    this.yPos = 30;                  // 月亮的 y 坐标
    this.currentPhase = 0;           // 月亮当前所处的时期
    this.opacity = 0;
    this.stars = [];                 // 存储星星
    this.drawStars = false;          // 是否绘制星星
    
    // 放置星星
    this.placeStars();
  }

  NightMode.config = {
    WIDTH: 20,         // 半月的宽度
    HEIGHT: 40,        // 月亮的高度
    FADE_SPEED: 0.035, // 淡入淡出的速度
    MOON_SPEED: 0.25,  // 月亮的速度
    NUM_STARS: 2,      // 星星的数量
    STAR_SIZE: 9,      // 星星的大小
    STAR_SPEED: 0.3,   // 星星的速度
    STAR_MAX_Y: 70,    // 星星在画布上的最大 y 坐标
  };
  
  // 月亮所处的时期（不同的时期有不同的位置）
  NightMode.phases = [140, 120, 100, 60, 40, 20, 0];

  NightMode.prototype = {
    draw: function () {
      // 月期为 3 时，月亮为满月
      var moonSourceWidth = this.currentPhase == 3 ? NightMode.config.WIDTH * 2 :
          NightMode.config.WIDTH;
      var moonSourceHeight = NightMode.config.HEIGHT;
  
      // 月亮在雪碧图中的 x 坐标
      var moonSourceX = this.spritePos.x + NightMode.phases[this.currentPhase];
      var moonOutputWidth = moonSourceWidth;
      
      // 星星在雪碧图中的 x 坐标
      var starSourceX = Runner.spriteDefinition.LDPI.STAR.x;
      var starSize = NightMode.config.STAR_SIZE;
  
      this.ctx.save();
      this.ctx.globalAlpha = this.opacity; // 画布的透明度随之变化
  
      // 绘制星星
      if (this.drawStars) {
        for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
          this.ctx.drawImage(
            Runner.imageSprite,
            starSourceX, this.stars[i].sourceY,
            starSize, starSize,
            Math.round(this.stars[i].x), this.stars[i].y,
            NightMode.config.STAR_SIZE, NightMode.config.STAR_SIZE,
          );
        }
      }
  
      // 绘制月亮
      this.ctx.drawImage(
        Runner.imageSprite,
        moonSourceX, this.spritePos.y,
        moonSourceWidth, moonSourceHeight,
        Math.round(this.xPos), this.yPos,
        moonOutputWidth, NightMode.config.HEIGHT
      );
      
      this.ctx.globalAlpha = 1;
      this.ctx.restore();
    },
    /**
      * 更新月亮位置，改变月期
      * @param {Boolean} activated 是否夜晚模式被激活
      */
    update: function (activated) {
      // 改变月期
      if (activated && this.opacity === 0) {
        this.currentPhase++;
  
        if (this.currentPhase >= NightMode.phases.length) {
          this.currentPhase = 0;
        }
      }
  
      // 淡入
      if (activated && (this.opacity < 1 || this.opacity === 0)) {
        this.opacity += NightMode.config.FADE_SPEED;
      } else if (this.opacity > 0) { // 淡出
        this.opacity -= NightMode.config.FADE_SPEED;
      }
  
      // 设置月亮和星星的位置
      if (this.opacity > 0) {
        // 更新月亮的 x 坐标
        this.xPos = this.updateXPos(this.xPos, NightMode.config.MOON_SPEED);
  
        // 更新星星的 x 坐标
        if (this.drawStars) {
          for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
            this.stars[i].x = this.updateXPos(this.stars[i].x, 
              NightMode.config.STAR_SPEED);
          }
        }
  
        this.draw();
      } else {
        this.opacity = 0;
        this.placeStars();
      }
  
      this.drawStars = true;
    },
    updateXPos: function (currentPos, speed) {
      // 月亮移出画布半个月亮宽度，将其位置移动到画布右边
      if (currentPos < -NightMode.config.WIDTH) {
        currentPos = this.containerWidth;
      } else {
        currentPos -= speed;
      }
  
      return currentPos;
    },
    placeStars: function () {
      // 将画布分为若干组
      var segmentSize = Math.round(this.containerWidth /
        NightMode.config.NUM_STARS);
  
      for (var i = 0; i < NightMode.config.NUM_STARS; i++) {
        this.stars[i] = {};
  
        // 分别随机每组画布中星星的位置
        this.stars[i].x = getRandomNum(segmentSize * i, segmentSize * (i + 1));
        this.stars[i].y = getRandomNum(0, NightMode.config.STAR_MAX_Y);
  
        // 星星在雪碧图中的 y 坐标
        this.stars[i].sourceY = Runner.spriteDefinition.LDPI.STAR.y +
            NightMode.config.STAR_SIZE * i;
      }
    },
    reset: function() {
      this.currentPhase = 0;
      this.opacity = 0;
      this.update(false);
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

    // 夜晚模式
    this.nightMode = null;

    // 地面
    this.horizonLine = null;
  
    this.init();
  }

  Horizon.prototype = {
    init: function () {
      this.addCloud();
      this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
      this.nightMode = new NightMode(this.canvas, this.spritePos.MOON,
        this.dimensions.WIDTH);
    },
    update: function (deltaTime, currentSpeed, updateObstacles, showNightMode) {
      this.horizonLine.update(deltaTime, currentSpeed);
      this.updateCloud(deltaTime, currentSpeed);
      this.nightMode.update(showNightMode);

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
    // 重置背景类
    reset: function() {
      this.obstacles = [];
      this.horizonLine.reset();
      this.nightMode.reset();
    },
  };
})();