/**
 * 防抖函数
 * @param {Object} func 要执行的函数
 * @param {Number} wait 间隔时间
 */
function debounce(func, wait) {
  var timer;

  return function () {
    var context = this;
    var args = arguments;

    clearTimeout(timer);
    timer = setTimeout(function () {
      func.apply(context, args);
    }, wait);
  }
}

/**
 * 获取数组中的最小数
 * @param {Array} arr 数字数组
 */
function getMinNum(arr) {
  return Math.min.apply(Math, arr);
}

function getScrollTop() {
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
}

function getClient() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0
  };
}