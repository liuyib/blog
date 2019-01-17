window.onload = function() {
  var oLoadWrapper = document.getElementById('oLoadWrapper');
  oLoadWrapper.outerHTML = '';
  
  var oOkBtn = document.getElementById("oOkBtn");
  oOkBtn.onmousedown = function() {
    this.className = "myAntd_btn myAntd_btn_primary";
  };
  oOkBtn.onmouseup = function() {
    this.className = "myAntd_btn myAntd_btn_primary myAntd_btn_click";
  };

  var oCheckbox = document.getElementById("oCheckbox");
  oCheckbox.onclick = function() {
    this.checked
      ? (this.parentNode.className = "myAntd_checkbox myAntd_checkbox_checked")
      : (this.parentNode.className = "myAntd_checkbox");
  };

  oOkBtn.onclick = function () {
    var oTextareaBefore = document.getElementById('oTextareaBefore');
    var oTextareaAfter = document.getElementById('oTextareaAfter');
    var oCheckbox = document.getElementById('oCheckbox');
    var sRemoveHtml = oTextareaBefore.value.replace(/<[^>]+>/ig, '');
    
    oTextareaAfter.value = oCheckbox.checked ? sRemoveHtml.replace(/\s*/g, '') : sRemoveHtml;
  };
};
