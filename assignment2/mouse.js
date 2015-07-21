"use strict";

var canvas;
var gl;
var points = [];
var subdivisionCount = 5;
var degrees = 30;
var showGasket = false;

var vertices = [
  vec2(-Math.sqrt(3)/2, -1/2),
  vec2(0, 1),
  vec2(Math.sqrt(3)/2, -1/2)
];

// Set initialization function
window.onload = function init() {

  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  // Configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Load shaders and initialize attribute buffers
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Initialize GPU buffer
  var bufferId = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

  // Associate out shader variables with our data buffer
  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  updatePoints();
  render();
};

// Update triangles to be rendered
function updatePoints() {
  points = [];

  // Subdivide initial triangle
  divideTriangle(vertices[0], vertices[1], vertices[2], subdivisionCount);

  // Load the data into the GPU
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
}

// Add triage to points array
function triangle(a, b, c) {
  points.push(a, b, c);
}

// Recusively divide triangle coordinates
function divideTriangle(a, b, c, count) {

  // check for end of subdivision
  if (count == 0) {
    triangle(rotate(a), rotate(b), rotate(c));
  } else {
    // bisect the sides
    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var bc = mix(b, c, 0.5);

    // decrease subdivision count
    --count;

    // four new triangles
    divideTriangle(a, ab, ac, count);
    divideTriangle(c, ac, bc, count);
    divideTriangle(b, bc, ab, count);
    if (!showGasket) {
      divideTriangle(ac, bc, ab, count);
    }
  }
}

// Rotate a vec2 by the global angle 'degrees'
function rotate(point) {
  var x = point[0];
  var y = point[1];
  var dist = Math.sqrt(x*x + y*y);
  var theta = dist*degrees*(Math.PI/180);

  return vec2(
    x*Math.cos(theta)-y*Math.sin(theta),
    x*Math.sin(theta)+y*Math.cos(theta));
}

// Render
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

// Handle updates from user
function inputUpdate(input) {
  if (input.id == "steps") {
    subdivisionCount = input.value;
    document.getElementById("steps-text").innerHTML = input.value;
  } else if (input.id == "angle") {
    degrees = input.value;
    document.getElementById("angle-text").innerHTML = input.value;
  } else if (input.id == "gasket") {
    showGasket = input.checked;
  }
  updatePoints();
  render();
}
