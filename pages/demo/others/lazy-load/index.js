window.onload = function () {
  var clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;

  // 懒加载函数
  function lazyLoad() {
    var oImgs = document.querySelectorAll('.lazy_img'); // 获取到的是类数组对象（不能直接使用 forEach 方法）
    
    Array.prototype.forEach.call(oImgs, function (item) {
      if (!item.dataset.original) return; // 加载过的图片不再加载

      var rect = item.getBoundingClientRect();
      
      if (rect.bottom >= 0 && rect.top < clientHeight) {
        item.src = item.getAttribute('data-original');
        item.removeAttribute('data-original');
        item.removeAttribute('lazyLoad');
      }
    });
  }

  // 节流函数
  function thorottle(func, wait) {
    var prev = 0;

    return function () {
      var now = +new Date();

      if (now - prev > wait) {
        func.apply(this, arguments);
        prev = now;
      }
    };
  }

  // 初始加载首屏图片
  lazyLoad();

  document.addEventListener('scroll', thorottle(lazyLoad, 100));
};