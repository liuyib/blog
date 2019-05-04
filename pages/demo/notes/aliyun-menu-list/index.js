window.onload = function () {
  var oMenu = document.getElementById('cate_menu');
  var oSubMenu = document.getElementById('cate_part')
  var aMenu_items = document.querySelectorAll('.cate_menu_item');
  var aPart_items = document.querySelectorAll('.cate_part_col');

  var timer = null;
  var isMouseInSub = false;
  var mousePos = []; // 储存鼠标移动的坐标

  oSubMenu.onmouseenter = () => isMouseInSub = true;
  oSubMenu.onmouseleave = () => isMouseInSub = false;

  
  for (let i = 0; i < aMenu_items.length; i++) {
    aMenu_items[i].onmouseenter = function () {
      if (timer) clearTimeout(timer);
      
      var curMousePos = mousePos[1]; // 当前鼠标的位置
      var preMousePos = mousePos[0]; // 上次鼠标的位置
      
      if (!!preMousePos && !!curMousePos) {
        // 子菜单需要延迟
        var delay = needDelay(oSubMenu, preMousePos, curMousePos);
  
        if (delay) {
          timer = setTimeout(function () {        
            if (isMouseInSub) return;
    
            toggleSubMenu(i);
            timer = null;
          }, 600);
        } else {
          toggleSubMenu(i);
        }
      }
    };
  }

  function mouseMoveHandler(e) {
    mousePos.push({
      x: e.clientX,
      y: e.clientY,
    });

    // 只保存两次移动的坐标，即当前和上一次鼠标的坐标
    if (mousePos.length > 2) mousePos.shift();
  }

  oMenu.onmouseenter = function () {
    document.addEventListener('mousemove', mouseMoveHandler);
  };

  oMenu.onmouseleave = function () {
    document.removeEventListener('mousemove', mouseMoveHandler);
  };

  /**
   * 判断是否需要延迟
   * @param {HTMLElement} elem 子菜单的 HTML 元素
   * @param {Object} prePos 上一次鼠标的位置
   * @param {Object} curPos 当前鼠标的位置
   */
  function needDelay(elem, prePos, curPos) {
    // 子菜单左上角和左下角的坐标
    var pos1 = { x: elem.offsetLeft, y: elem.offsetTop };
    var pos2 = { x: elem.offsetLeft, y: elem.offsetTop + elem.offsetHeight };

    return isInTriangle(pos1, pos2, prePos, curPos);
  }

  /**
   * 切换子菜单
   * @param {Number} i 索引
   */
  function toggleSubMenu(i) {
    for (let j = 0; j < aMenu_items.length; j++) {
      aPart_items[j].className = 'cate_part_col';
    }

    aPart_items[i].classList.toggle('cate_part_col_show');
  }

  // ===============================================
  // 判断一个点是否在三角形内
  // ===============================================

  // 获取两个点的向量
  function vector(a, b) {
    return {
      x: b.x - a.x,
      y: b.y - a.y,
    }
  }

  // 两个向量进行点乘
  function dotMul(v1, v2) {
    return (v1.x * v2 .y - v2.x * v1.y) > 0;
  }
  
  // 三个点构造两个向量进行点乘运算
  function vectorResult(a, b, p) {
    return dotMul(vector(a, p), vector(b, p));
  }

  // 判断一个点是否在三角形内
  function isInTriangle(a, b, c, p) {
    var t = vectorResult(a, b, p);

    if (t !== vectorResult(b, c, p)) return false;
    if (t !== vectorResult(c, a, p)) return false;

    return true;
  }
  // ===============================================
};