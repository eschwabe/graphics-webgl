"use strict";

var canvas;
var gl;
var color = vec4(0.0, 0.0, 0.0, 1.0);
var colors = [];

var numPointsCone, numPointsCylinder, numPointsSphere;
var vBufferCone, vBufferCylinder, vBufferSphere;
var vPosition, vColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye = vec3(1.0, 1.0, 1.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

// Initialize window
window.onload = function init() {

  canvas = document.getElementById("gl-canvas");

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL is not available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Load shaders and initialize attribute buffers
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Create object vertices
  vBufferCone = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCone);
  var cone = unitCone();
  numPointsCone = cone.length;
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cone), gl.STATIC_DRAW);

  vBufferCylinder = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCylinder);
  var cylinder = unitCylinder();
  numPointsCylinder = cylinder.length;
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cylinder), gl.STATIC_DRAW);

  vBufferSphere = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferSphere);
  var sphere = unitSphere();
  numPointsSphere = sphere.length;
  gl.bufferData(gl.ARRAY_BUFFER, flatten(sphere), gl.STATIC_DRAW);

  vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Compute model, view, projection matricies
  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

  modelViewMatrix = lookAt(eye, at, up);
  projectionMatrix = ortho(-2.0, 2.0, -2.0, 2.0, -4, 4);

  gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
  gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

/*
  var cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);
  */

  render();
}

// Render
var theta = 0.0
var phi = 0.0;
function render() {
  theta += 0.005;
  phi += 0.008;
  eye = vec3(Math.sin(theta)*Math.cos(phi),
    Math.sin(theta)*Math.sin(phi), Math.cos(theta));

  modelViewMatrix = lookAt(eye, at , up);

  gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCone);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINES, 0, numPointsCone);

  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCylinder);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINES, 0, numPointsCylinder);

  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferSphere);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.LINES, 0, numPointsSphere);

  window.requestAnimFrame(render);
}

function unitCylinder() {
  var cylinder = [];
  var divisions = 15;
  var r = 0.5;
  for(var i = 0; i < divisions; ++i) {
    var theta = i/divisions * 2*Math.PI;
    var ntheta = (i+1)/divisions * 2*Math.PI;
    // center to cone base
    cylinder.push(vec4(0, 0, 0));
    cylinder.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    // cone base to next cone base
    cylinder.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    cylinder.push(vec4(r*Math.cos(ntheta), 0, r*Math.sin(ntheta)));
    // top center to cone top
    cylinder.push(vec4(0, r*2, 0));
    cylinder.push(vec4(r*Math.cos(theta), r*2, r*Math.sin(theta)));
    // cone top to next cone top
    cylinder.push(vec4(r*Math.cos(theta), r*2, r*Math.sin(theta)));
    cylinder.push(vec4(r*Math.cos(ntheta), r*2, r*Math.sin(ntheta)));
    // cone base to top
    cylinder.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    cylinder.push(vec4(r*Math.cos(theta), r*2, r*Math.sin(theta)));
  }
  return cylinder;
}

function unitCone() {
  var cone = [];
  var divisions = 15;
  var r = 0.5;
  for(var i = 0; i < divisions; ++i) {
    var theta = i/divisions * 2*Math.PI;
    var ntheta = (i+1)/divisions * 2*Math.PI;
    // center to cone base
    cone.push(vec4(0, 0, 0));
    cone.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    // cone base to next cone base
    cone.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    cone.push(vec4(r*Math.cos(ntheta), 0, r*Math.sin(ntheta)));
    // cone base to top
    cone.push(vec4(r*Math.cos(theta), 0, r*Math.sin(theta)));
    cone.push(vec4(0, r*2, 0));
  }
  return cone;
}

// Generate lines for displaying a triangle
function triangle(points, a, b, c) {
  points.push(a);
  points.push(b);
  points.push(b);
  points.push(c);
  points.push(c);
  points.push(a);
}

// Divide triangle to form sphere
function divideTriangle(points, a, b, c, count) {
  if ( count > 0 ) {
    var ab = mix( a, b, 0.5);
    var ac = mix( a, c, 0.5);
    var bc = mix( b, c, 0.5);

    ab = normalize(ab, true);
    ac = normalize(ac, true);
    bc = normalize(bc, true);

    divideTriangle(points, a, ab, ac, count-1);
    divideTriangle(points, ab, b, bc, count-1);
    divideTriangle(points, bc, c, ac, count-1);
    divideTriangle(points, ab, bc, ac, count-1);
  }
  else {
    triangle(points, a, b, c);
  }
}

// Generate a unit-size sphere shape
function unitSphere() {
  var divisions = 4;
  var sphere = [];

  var va = vec4(0.0, 0.0, -1.0);
  var vb = vec4(0.0, 0.942809, 0.333333);
  var vc = vec4(-0.816497, -0.471405, 0.333333);
  var vd = vec4(0.816497, -0.471405, 0.333333);

  divideTriangle(sphere, va, vb, vc, divisions);
  divideTriangle(sphere, vd, vc, vb, divisions);
  divideTriangle(sphere, va, vd, vb, divisions);
  divideTriangle(sphere, va, vc, vd, divisions);

  return sphere;
}
