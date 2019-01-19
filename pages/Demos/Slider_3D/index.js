window.onload = function () {
  // Img datas
  var IMG_DATAS = [
    {
      width: 300,
      top: -20,
      left: 150,
      opacity: 20,
      zIndex: 2,
    },
    {
      width: 500,
      top: 30,
      left: 50,
      opacity: 80,
      zIndex: 3,
    },
    {
      width: 600,
      top: 100,
      left: 300,
      opacity: 100,
      zIndex: 4,
    },
    {
      width: 500,
      top: 30,
      left: 650,
      opacity: 80,
      zIndex: 3,
    },
    {
      width: 300,
      top: -20,
      left: 750,
      opacity: 20,
      zIndex: 2,
    }
  ];

  var oBtnLeft = document.getElementById('slider-arrow-left');
  var oBtnRight = document.getElementById('slider-arrow-right');
  var oImgsWrapper = document.getElementById('slider-imgs');
  var aImgs = oImgsWrapper.getElementsByTagName('li');

  function _startMove() {
    IMG_DATAS.forEach((item, index) => {
      startMove(aImgs[index], item, null);
    });
  }

  // init
  _startMove();

  oBtnLeft.onclick = function () {
    IMG_DATAS.push(IMG_DATAS.shift());
    _startMove();
  };

  oBtnRight.onclick = function () {
    IMG_DATAS.unshift(IMG_DATAS.pop());    
    _startMove();
  };
};