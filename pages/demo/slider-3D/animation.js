/**
 * 获取某个属性的值
 * @param {Object} elem 当前元素
 * @param {String} attr 属性
 */
function getStyle(elem, attr) {
  if (window.getComputedStyle) {
    return window.getComputedStyle(elem, null)[attr];
  } else {
    return elem.currentStyle[attr];
  }
}

/**
 * 运动框架
 * @param {Object}   elem 当前元素
 * @param {Object}   json 要操作的属性 // 传透明度属性时,单位为100
 * @param {Function} fn   回调函数
 * @param {Number}   slow 动画的缓慢程度 // 数值越大,动画越迟缓。
 * @param {Number}   time 每次动画执行时间
 */
function startMove(elem, json, fn = null, slow = 10, time = 15) {
  clearInterval(elem.timer);

  elem.timer = setInterval(function() {
    var bStop = true;
    
    for (var attr in json) {
      var iCur = 0;
      var target = json[attr];

      if (attr === "opacity") {
        iCur = getStyle(elem, attr) * 100 || 1;
      } else {
        iCur = parseInt(getStyle(elem, attr)) || 0;
      }

      var iSpeed = (target - iCur) / slow;
      iSpeed = iSpeed > 0 ? Math.ceil(iSpeed) : Math.floor(iSpeed);
      iCur += iSpeed;

      if (attr === "opacity") {
        elem.style.filter = "alpha(opacity=" + iCur + ")";
        elem.style[attr] = iCur / 100;
      } else if (attr === 'zIndex') {
        elem.style.zIndex = target;
      } else {
        elem.style[attr] = iCur + "px";
      }

      (iCur != target) && (bStop = false);
    }

    if (bStop) {
      clearInterval(elem.timer);
      fn && fn();
    }
  }, time);
}