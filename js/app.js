particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 40,
      "density": {
        "enable": true,
        "value_area": 500  // 密集程度
      }
    },
    "color": {
      "value": ["#4cb890", "#ed1c24"]  // rgb, array
    },
    "shape": {
      "type": "polygon",  // ["circle", "triangle", "edge", "polygon", "star", "image"]
      "stroke": {
        "width": 0.1,
        "color": "#333"
      },
      "polygon": {
        "nb_sides": 5
      },
      "image": {
        "src": "assets/xxxx.jpg",
        "width": 100,
        "height": 100
      }
    },
    "opacity": {
      "value": 0.8,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.6,
        "sync": true
      }
    },
    "size": {
      "value": 2.4,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 2,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 180,
      "color": "#c3c3ff",  // #c3c3ff
      "opacity": 0.8,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 2.5,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab"
      },
      "onclick": {
        "enable": false,
        "mode": "push"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 200,  // 连接鼠标线条的范围
        "line_linked": {
          "opacity": 0.8
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});