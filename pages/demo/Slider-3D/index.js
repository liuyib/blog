window.onload = function () {
  var IMG_DATAS = [{
    index: 0,
    width: 300,
    top: -20,
    left: 150,
    opacity: 20,
    zIndex: 2,
  }, {
    index: 1,
    width: 500,
    top: 30,
    left: 50,
    opacity: 80,
    zIndex: 3,
  }, {
    index: 2,
    width: 600,
    top: 100,
    left: 300,
    opacity: 100,
    zIndex: 4,
  }, {
    index: 3,
    width: 500,
    top: 30,
    left: 650,
    opacity: 80,
    zIndex: 3,
  }, {
    index: 4,
    width: 300,
    top: -20,
    left: 750,
    opacity: 20,
    zIndex: 2,
  }];

  var oBtnLeft = document.getElementById('slider-arrow-left');
  var oBtnRight = document.getElementById('slider-arrow-right');
  var oImgsWrapper = document.getElementById('slider-imgs');
  var aImgs = oImgsWrapper.getElementsByTagName('li');
  // 计算中间的图片的索引
  var nMiddleImgIndex = Math.floor(aImgs.length / 2);

  for (let i = 0; i < aImgs.length; i++) {
    aImgs[i].onclick = function () {
      // 计算图片的数据需要移动几次
      var nMoveLen = IMG_DATAS[i].index - nMiddleImgIndex;

      if (!nMoveLen) return; // 图片已经在中间
      if (nMoveLen < 0) {    // 点击左边的图片，图片右移
        for (let j = 0; j < Math.abs(nMoveLen); j++) {
          IMG_DATAS.push(IMG_DATAS.shift());
        }
      } else {               // 点击右边的图片，图片左移
        for (let j = 0; j < nMoveLen; j++) {
          IMG_DATAS.unshift(IMG_DATAS.pop());
        }
      }

      sliderMove();
    };
  }
  
  // 图片轮播
  function sliderMove() {
    IMG_DATAS.forEach(function(item, index) {
      startMove(aImgs[index], item);
    })
  }

  // 页面初始加载，执行一次动画
  sliderMove();

  // 点击左按钮
  oBtnLeft.onclick = function () {
    IMG_DATAS.push(IMG_DATAS.shift());
    sliderMove();
  };

  // 点击右按钮
  oBtnRight.onclick = function () {
    IMG_DATAS.unshift(IMG_DATAS.pop());
    sliderMove();
  };
};
