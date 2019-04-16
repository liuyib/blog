window.onload = function () {
  var chromeDino = document.getElementById('chrome-dino');
  chromeDino.classList.add('offline');

  new Runner('#chrome-dino');
};