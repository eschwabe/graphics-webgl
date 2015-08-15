"use strict";

var canvas;
var gl;

var objects = [];

var colors = [
  vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
  vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
  vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
  vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
  vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
  vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
  vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
  vec4( 0.5, 0.5, 0.5, 1.0 ),  // grey
];

var numPointsCone, numPointsCylinder, numPointsSphere;
var vBufferCone, vBufferCylinder, vBufferSphere;
var vPosition, fColor;

var eye = vec3(0.0, 5.0, 15.0);
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var modelViewMatrix = lookAt(eye, at, up);
//var projectionMatrix = ortho(-5.0, 5.0, -5.0, 5.0, -25, 25);
var projectionMatrix = perspective(60.0, 1, -1, 1);
var modelViewMatrixLoc, projectionMatrixLoc;

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

  // Associate position vertices with shader input
  vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Get location for model and projection matrices
  modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

  gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
  gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

  // Setup color attribute
  fColor = gl.getUniformLocation(program, "fColor");

  // Initialize first object
  objects.push(objectCreate());

  // Implement handlers for controls
  initializeHandlers();

  render();
}

// Control elements
function initializeHandlers() {

  var controlObjectAdd = document.getElementById("object-add");
  var controlObjectList = document.getElementById("object-list");
  var controlObjectType = document.getElementById("object-type");
  var controlObjectColor = document.getElementById("object-color");

  var controlTranslateX = document.getElementById("translate-x");
  var controlTranslateY = document.getElementById("translate-y");
  var controlTranslateZ = document.getElementById("translate-z");

  var controlRotateX = document.getElementById("rotate-x");
  var controlRotateY = document.getElementById("rotate-y");
  var controlRotateZ = document.getElementById("rotate-z");

  var controlScaleX = document.getElementById("scale-x");
  var controlScaleY = document.getElementById("scale-y");
  var controlScaleZ = document.getElementById("scale-z");

  controlObjectAdd.onclick = function() {
    objects.push(objectCreate());
    var idx = objects.length-1;
    controlObjectList[controlObjectList.options.length] = new Option('Object '+(idx+1), idx);
  }

  controlObjectType.onchange = function(event) {
    var element = event.srcElement;
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    if(element.value == 'sphere') {
      objects[idx].vBuffer = vBufferSphere;
      objects[idx].numVerticies = numPointsSphere;
    } else if(element.value == 'cone') {
      objects[idx].vBuffer = vBufferCone;
      objects[idx].numVerticies = numPointsCone;
    } else if(element.value == 'cylinder') {
      objects[idx].vBuffer = vBufferCylinder;
      objects[idx].numVerticies = numPointsCylinder;
    }
  }

  controlObjectColor.onchange = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].color = colors[event.srcElement.value];
  }

  // Translation
  controlTranslateX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateX = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlTranslateY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateY = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlTranslateZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateZ = event.srcElement.value;
    objects[idx].updateTransform();
  }

  // Rotation
  controlRotateX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateX = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlRotateY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateY = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlRotateZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateZ = event.srcElement.value;
    objects[idx].updateTransform();
  }

  // Scale
  controlScaleX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleX = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlScaleY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleY = event.srcElement.value;
    objects[idx].updateTransform();
  }
  controlScaleZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleZ = event.srcElement.value;
    objects[idx].updateTransform();
  }
}

function objectCreate() {
  var obj = {
    vBuffer: vBufferSphere,
    numVerticies: numPointsSphere,
    color: colors[0],
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    matTransform: mat4(),
    updateTransform: function () {
      var matT = translate(obj.translateX, obj.translateY, obj.translateZ);
      var matRx = rotate(obj.rotateX, [1, 0, 0]);
      var matRy = rotate(obj.rotateY, [0, 1, 0]);
      var matRz = rotate(obj.rotateZ, [0, 0, 1]);
      var matS = scalem(obj.scaleX, obj.scaleY, obj.scaleZ);

      var tmp = mat4();
      tmp = mult(matRx, tmp);
      tmp = mult(matRy, tmp);
      tmp = mult(matRz, tmp);
      tmp = mult(matS, tmp);
      tmp = mult(matT, tmp);
      obj.matTransform = tmp;
    }
  };
  obj.updateTransform();
  return obj;
}

// Render
var theta = 0.0
var phi = 0.0;
function render() {
  theta += 0.005;
  phi += 0.008;
  //eye = vec3(Math.sin(theta)*Math.cos(phi),
  //  Math.sin(theta)*Math.sin(phi), Math.cos(theta));

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var cameraMatrix = lookAt(eye, at , up);

  for(var i = 0; i < objects.length; ++i) {
    // Set object transformation
    modelViewMatrix = mult(cameraMatrix, objects[i].matTransform);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Set object color
    gl.uniform4fv(fColor, flatten(objects[i].color));

    // Set object vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, objects[i].vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, objects[i].numVerticies);
  }

  window.requestAnimFrame(render);
}

// Generate lines for a unit-size cylinder
function unitCylinder() {
  var cylinder = [];
  var divisions = 30;
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

// Generate lines for a unit-size cone
function unitCone() {
  var cone = [];
  var divisions = 30;
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
  var divisions = 5;
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
