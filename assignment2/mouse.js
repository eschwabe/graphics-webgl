"use strict";

var canvas;
var gl;
var color = vec4(0.0, 0.0, 0.0, 1.0);
var colors = [];
var points = [];
var points_size = 0;
var redraw = false;

// Initialize window
window.onload = function init() {

  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL is not available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  //  Load shaders and initialize attribute buffers
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  var cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  colorUpdate();
  render();

  // Handle mousedown event
  canvas.addEventListener("mousedown", function(event) {
    // Start new line segment
    if (!redraw) {
      points.push(computePoint(event, canvas));
      colors.push(color);
      redraw = true;
    }
  });

  // Handle mouseup event
  canvas.addEventListener("mouseup", function(event) {
    // End line segment
    points.push(computePoint(event, canvas));
    colors.push(color);
    redraw = false;
  });

  // Handle mousemove event
  canvas.addEventListener("mousemove", function(event) {
    if (redraw) {
      // Compute and store new vertex
      points.push(computePoint(event, canvas));
      points.push(computePoint(event, canvas));
      gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
      points_size = points.length-1;

      // Store vertex color
      gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
      colors.push(color);
      colors.push(color);
      gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    }
  });

  // Handle color input event
  document.getElementById("range-red").onchange = colorUpdate;
  document.getElementById("range-green").onchange = colorUpdate;
  document.getElementById("range-blue").onchange = colorUpdate;
  document.getElementById("range-blue").onchange = colorUpdate;
  document.getElementById("line-size").onchange = lineWidthUpdate;
}

// Compute mouse pointer location from event
function computePoint(event, canvas) {
  // var vertex = vec2(2 * event.clientX / canvas.width - 1,
  //   2 * (canvas.height - event.clientY) / canvas.height - 1);
  var rect = event.target.getBoundingClientRect();
  var x = ((event.clientX - rect.left) - canvas.width/2)/(canvas.width/2);
  var y = (canvas.height/2 - (event.clientY - rect.top))/(canvas.height/2);
  return vec2(x,y);
}

// Update line width
function lineWidthUpdate(event) {
  var selectLine = document.getElementById("line-size");
  gl.lineWidth(selectLine.options[selectLine.selectedIndex].value);
}

// Render
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.LINES, 0, points_size);
  window.requestAnimFrame(render);
}

// Clear screen
function clearScreen() {
  points = [];
  colors = [];
  points_size = 0;
}

// Update selected color
function colorUpdate() {
  var red = document.getElementById("range-red").value;
  var green = document.getElementById("range-green").value;
  var blue = document.getElementById("range-blue").value;
  var colorbox = document.getElementById("color-box");
  color = vec4(red/255.0, green/255.0, blue/255.0, 1.0);
  colorbox.style.backgroundColor = "rgb("+red+","+green+","+blue+")";
}
