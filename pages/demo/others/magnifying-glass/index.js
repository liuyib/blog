window.onload = function() {
  var oSmallImg = document.getElementById('small_img');
  var oLargeImg = document.getElementById('large_img');
  var oMagnifyingGlass = document.getElementById('magnifying_glass');
  var oSmallImgWrapper = document.getElementById('small_img_wrapper');

  oSmallImgWrapper.onmouseover = function () {
    oLargeImg.style.display = 'block';
    oMagnifyingGlass.style.display = 'block';
  };
  oSmallImgWrapper.onmouseout = function () {
    oLargeImg.style.display = 'none';
    oMagnifyingGlass.style.display = 'none';
  };

  oSmallImgWrapper.onmousemove = function (ev) {
    var _event = ev || event;

    // 放大镜的移动范围
    var GLASS_MOVE_LEFT = 0;
    var GLASS_MOVE_TOP = 0;
    var GLASS_MOVE_RIGHT = 100;
    var GLASS_MOVE_BOTTOM = 100;

    // 放大的比例
    var oScaleSize = oLargeImg.offsetWidth / oSmallImg.offsetWidth;
    
    // 获取鼠标坐标
    var oGlassLeft = _event.clientX - oSmallImgWrapper.offsetLeft - 50;
    var oGlassTop = _event.clientY - oSmallImgWrapper.offsetTop - 50;

    // 限制放大镜移动
    if (oGlassLeft <= GLASS_MOVE_LEFT) {
      oGlassLeft = GLASS_MOVE_LEFT;
    } else if (oGlassLeft >= GLASS_MOVE_RIGHT) {
      oGlassLeft = GLASS_MOVE_RIGHT;
    }

    if (oGlassTop <= GLASS_MOVE_TOP) {
      oGlassTop = GLASS_MOVE_TOP;
    } else if (oGlassTop >= GLASS_MOVE_BOTTOM) {
      oGlassTop = GLASS_MOVE_BOTTOM;
    }

    // 大图片的坐标（由于前面限制了放大镜的移动，所以这里大图片移动时相应的受到限制）
    var oBigImgLeft = - oGlassLeft * oScaleSize;
    var oBigImgTop= - oGlassTop * oScaleSize;

    // 放大镜移动
    oMagnifyingGlass.style.left = oGlassLeft + 'px';
    oMagnifyingGlass.style.top = oGlassTop + 'px';

    // 大图片移动
    oLargeImg.style.left = oBigImgLeft + 'px';
    oLargeImg.style.top = oBigImgTop + 'px';
  };
};
