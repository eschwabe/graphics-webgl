"use strict";

var canvas;
var gl;

// Supported colors
var colors = [
  vec4( 0.1, 0.1, 0.1, 1.0 ),  // black
  vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
  vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
  vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
  vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
  vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
  vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
  vec4( 0.5, 0.5, 0.5, 1.0 ),  // grey
  vec4( 1.0, 1.0, 1.0, 1.0 ),  // white
];

// Object variables
var objects = [];
var numPointsGrid, numPointsCone, numPointsCylinder, numPointsSphere;
var vBufferGrid, vBufferCone, vBufferCylinder, vBufferSphere;
var tBufferCone, tBufferCylinder, tBufferSphere;
var vPosition, vColor, vTextureCoordinate;

// Transformation matrices
var projectionMatrix = perspective(45.0, 1, 1, -1);
var modelMatrixLoc, viewMatrixLoc, projectionMatrixLoc;

// Camera objects and functions
var camera = cameraCreate();
var cameraPositionLoc;
var displayCameraUpdate = function() {};

// Lights
var lights = [ lightCreate(), lightCreate() ];
lights[1].enabled = false;

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

  // Grid vertices
  var grid = baseGrid();
  numPointsGrid = grid.length;
  vBufferGrid = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGrid);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

  // Cone vertices
  var cone = unitCone();
  numPointsCone = cone.length;
  vBufferCone = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCone);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cone), gl.STATIC_DRAW);
  tBufferCone = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBufferCone);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(generateTextureCoordinateBuffer(cone)), gl.STATIC_DRAW);

  // Cylinder vertices
  var cylinder = unitCylinder();
  numPointsCylinder = cylinder.length;
  vBufferCylinder = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferCylinder);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cylinder), gl.STATIC_DRAW);
  tBufferCylinder = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBufferCylinder);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(generateTextureCoordinateBuffer(cylinder)), gl.STATIC_DRAW);

  // Sphere vertices
  var sphere = unitSphere();
  numPointsSphere = sphere.length;
  vBufferSphere = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferSphere);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(sphere), gl.STATIC_DRAW);
  tBufferSphere = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tBufferSphere);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(generateTextureCoordinateBuffer(sphere)), gl.STATIC_DRAW);

  // Associate position vertices with shader input
  vPosition = gl.getAttribLocation(program, "vPosition");
  gl.enableVertexAttribArray(vPosition);

  // Associate texture coordinates with variable
  vTextureCoordinate = gl.getAttribLocation(program, "vTextureCoordinate");
  gl.enableVertexAttribArray(vTextureCoordinate);

  // Set model and projection matrices
  cameraPositionLoc = gl.getUniformLocation(program, "cameraPosition");
  viewMatrixLoc = gl.getUniformLocation( program, "viewMatrix" );
  modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
  projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
  gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

  // Set lighting attributes
  var ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
  gl.uniform4fv(ambientProductLoc, flatten(lights[0].ambient));
  var diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
  gl.uniform4fv(diffuseProductLoc, flatten(lights[0].diffuse));
  var specularProductLoc = gl.getUniformLocation(program, "specularProduct");
  gl.uniform4fv(specularProductLoc, flatten(lights[0].specular));
  var shininessLoc = gl.getUniformLocation(program, "shininess");
  gl.uniform1f(shininessLoc, lights[0].materialShininess);

  lights[0].positionLoc = gl.getUniformLocation(program, "lightPosition1");
  gl.uniform4fv(lights[0].positionLoc, flatten(lights[0].position));
  lights[1].positionLoc = gl.getUniformLocation(program, "lightPosition2");
  gl.uniform4fv(lights[1].positionLoc, flatten(lights[1].position));

  lights[0].enabledLoc = gl.getUniformLocation(program, "lightEnabled1");
  gl.uniform1i(lights[0].enabledLoc, lights[0].enabled);
  lights[1].enabledLoc = gl.getUniformLocation(program, "lightEnabled2");
  gl.uniform1i(lights[1].enabledLoc, lights[1].enabled);

  // Setup color attribute and textures
  vColor = gl.getUniformLocation(program, "vColor");
  configureTextures();

  // Initialize first object
  objects.push(objectCreate());

  // Implement handlers for controls
  initializeHandlers();

  render();
}

// Setup textures
function configureTextures() {
    var texture0 = gl.createTexture();
    var checkerboardSize = 128;
    var checkerboardImage = generateCheckboardImage(checkerboardSize);
    var earthImage = document.getElementById("earth-texture");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, checkerboardSize, checkerboardSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, checkerboardImage);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, earthImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

// Control elements
function initializeHandlers() {

  var controlCameraAutoRotation = document.getElementById("camera-auto-rotate");
  var controlCameraRotation = document.getElementById("camera-rotation");
  var controlCameraRadius = document.getElementById("camera-radius");
  var controlCameraAngle = document.getElementById("camera-angle");

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

  var controlLightList = document.getElementById("light-list");
  var controlLightEnable = document.getElementById("light-enabled");
  var controlLightX = document.getElementById("light-x");
  var controlLightY = document.getElementById("light-y");
  var controlLightZ = document.getElementById("light-z");

  // Camera
  displayCameraUpdate = function(event) {
    controlCameraRotation.value = camera.rotation;
  };
  controlCameraAutoRotation.onclick = function(event) {
    camera.autoRotate = !camera.autoRotate;
  };
  controlCameraRotation.oninput = function(event) {
    camera.rotation = parseFloat(event.target.value);
    camera.updatePosition();
  };
  controlCameraRadius.oninput = function(event) {
    camera.radius = parseFloat(event.target.value);
    camera.updatePosition();
  };
  controlCameraAngle.oninput = function(event) {
    camera.angle = parseFloat(event.target.value);
    camera.updatePosition();
  };

  // Objects
  controlObjectAdd.onclick = function(event) {
    objects.push(objectCreate());
    var idx = objects.length-1;
    controlObjectList[controlObjectList.options.length] = new Option('Object '+(idx+1), idx);
    controlObjectList.value = idx;
    controlObjectList.onchange();
  };
  controlObjectList.onchange = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    controlObjectType.value = objects[idx].type;
    controlObjectColor.value = objects[idx].color;
    controlTranslateX.value = objects[idx].translateX;
    controlTranslateY.value = objects[idx].translateY;
    controlTranslateZ.value = objects[idx].translateZ;
    controlRotateX.value = objects[idx].rotateX;
    controlRotateY.value = objects[idx].rotateY;
    controlRotateZ.value = objects[idx].rotateZ;
    controlScaleX.value = objects[idx].scaleX;
    controlScaleY.value = objects[idx].scaleY;
    controlScaleZ.value = objects[idx].scaleZ;
  };
  controlObjectType.onchange = function(event) {
    var element = event.target;
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].type = element.value;
    if(element.value === 0) {
      objects[idx].vBuffer = vBufferSphere;
      objects[idx].tBuffer = tBufferSphere;
      objects[idx].numVerticies = numPointsSphere;
    } else if(element.value == 1) {
      objects[idx].vBuffer = vBufferCone;
      objects[idx].tBuffer = tBufferCone;
      objects[idx].numVerticies = numPointsCone;
    } else if(element.value == 2) {
      objects[idx].vBuffer = vBufferCylinder;
      objects[idx].tBuffer = tBufferCylinder;
      objects[idx].numVerticies = numPointsCylinder;
    }
  };
  controlObjectColor.onchange = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].color = event.target.value;
  };

  // Translation
  controlTranslateX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateX = event.target.value;
    objects[idx].updateTransform();
  };
  controlTranslateY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateY = event.target.value;
    objects[idx].updateTransform();
  };
  controlTranslateZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].translateZ = event.target.value;
    objects[idx].updateTransform();
  };

  // Rotation
  controlRotateX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateX = event.target.value;
    objects[idx].updateTransform();
  };
  controlRotateY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateY = event.target.value;
    objects[idx].updateTransform();
  };
  controlRotateZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].rotateZ = event.target.value;
    objects[idx].updateTransform();
  };

  // Scale
  controlScaleX.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleX = event.target.value;
    objects[idx].updateTransform();
  };
  controlScaleY.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleY = event.target.value;
    objects[idx].updateTransform();
  };
  controlScaleZ.oninput = function(event) {
    var idx = controlObjectList[controlObjectList.selectedIndex].value;
    objects[idx].scaleZ = event.target.value;
    objects[idx].updateTransform();
  };

  // Lights
  controlLightList.onchange = function(event) {
    var idx = controlLightList[controlLightList.selectedIndex].value;
    controlLightEnable.checked = lights[idx].enabled;
    controlLightX.value = lights[idx].position[0];
    controlLightY.value = lights[idx].position[1];
    controlLightZ.value = lights[idx].position[2];
  };
  controlLightEnable.onclick = function(event) {
    var idx = controlLightList[controlLightList.selectedIndex].value;
    lights[idx].enabled = event.target.checked;
    gl.uniform1i(lights[idx].enabledLoc, lights[idx].enabled);
  };
  controlLightX.oninput = function(event) {
    var idx = controlLightList[controlLightList.selectedIndex].value;
    lights[idx].position[0] = event.target.value;
    gl.uniform4fv(lights[idx].positionLoc, flatten(lights[idx].position));
    lights[idx].updateTransform();
  };
  controlLightY.oninput = function(event) {
    var idx = controlLightList[controlLightList.selectedIndex].value;
    lights[idx].position[1] = event.target.value;
    gl.uniform4fv(lights[idx].positionLoc, flatten(lights[idx].position));
    lights[idx].updateTransform();
  };
  controlLightZ.oninput = function(event) {
    var idx = controlLightList[controlLightList.selectedIndex].value;
    lights[idx].position[2] = event.target.value;
    gl.uniform4fv(lights[idx].positionLoc, flatten(lights[idx].position));
    lights[idx].updateTransform();
  };

}

function cameraCreate() {
  var camera = {
    autoRotate: true,
    rotation: 0.0,
    radius: 30,
    angle: 67.0,
    eye: vec3(),
    at: vec3(0.0, 0.0, 0.0),
    up: vec3(0.0, 1.0, 0.0),

    updatePosition: function() {
      if(camera.rotation > 180.0) {
        camera.rotation = -180.0;
      }
      var rotationRadians = camera.rotation * (Math.PI / 180);
      var angleRadians = camera.angle * (Math.PI / 180);
      var x = camera.radius * Math.sin(angleRadians) * Math.sin(rotationRadians);
      var z = camera.radius * Math.sin(angleRadians) * Math.cos(rotationRadians);
      var y = camera.radius * Math.cos(angleRadians);
      camera.eye = vec3(x, y, z);
    }
  }
  camera.updatePosition();
  return camera;
}

function lightCreate() {
  var light = {
    enabled: true,
    ambient: vec4(0.2, 0.2, 0.2, 1.0),
    diffuse: vec4(1.0, 1.0, 1.0, 1.0),
    specular: vec4(1.0, 1.0, 1.0, 1.0),
    materialShininess: 40.0,
    position: vec4(25.0, 25.0, 25.0, 0.0),
    positionLoc: null,
    enabledLoc: null,
    objectColor: 0,
    matTransform: mat4(),
    updateTransform: function () {
      var matT = translate(light.position[0], light.position[1], light.position[2]);
      var matS = scalem(0.25, 0.25, 0.25);
      light.matTransform = mult(matT, matS);
    }
  };
  light.updateTransform();
  return light;
}

function objectCreate() {
  var obj = {
    type: 0,
    vBuffer: vBufferSphere,
    numVerticies: numPointsSphere,
    tBuffer: tBufferSphere,
    color: 8,
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
      tmp = mult(matS, tmp);
      tmp = mult(matRx, tmp);
      tmp = mult(matRy, tmp);
      tmp = mult(matRz, tmp);
      tmp = mult(matT, tmp);
      obj.matTransform = tmp;
    }
  };
  obj.updateTransform();
  return obj;
}

// Render
function render() {

  // Update camera
  if(camera.autoRotate) {
    camera.rotation += 0.25;
    camera.updatePosition();
    displayCameraUpdate();
  }
  var cameraMatrix = lookAt(camera.eye, camera.at, camera.up);
  gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(cameraMatrix));
  gl.uniform4fv(cameraPositionLoc, flatten(vec4(camera.eye)));

  // Clear screen
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw Grid
  gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(mat4()));
  gl.uniform4fv(vColor, flatten(colors[0]));
  gl.bindBuffer(gl.ARRAY_BUFFER, vBufferGrid);
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.disableVertexAttribArray(vTextureCoordinate);
  gl.drawArrays(gl.LINES, 0, numPointsGrid);

  // Draw Lights
  for(var i = 0; i < lights.length; ++i) {
    if(lights[i].enabled) {
      // Set object transformation
      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(lights[i].matTransform));

      // Set object color
      gl.uniform4fv(vColor, flatten(colors[lights[i].objectColor]));

      // Set object vertex buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, vBufferSphere);
      gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
      gl.disableVertexAttribArray(vTextureCoordinate);
      gl.drawArrays(gl.TRIANGLES, 0, numPointsSphere);
    }
  }

  // Draw Objects
  for(var i = 0; i < objects.length; ++i) {
    // Set object transformation
    gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(objects[i].matTransform));

    // Set object color
    gl.uniform4fv(vColor, flatten(colors[objects[i].color]));

    // Set object vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, objects[i].vBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, objects[i].tBuffer);
    gl.vertexAttribPointer(vTextureCoordinate, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTextureCoordinate);
    gl.drawArrays(gl.TRIANGLES, 0, objects[i].numVerticies);
  }

  window.requestAnimFrame(render);
}

// Create a checkerboard pattern using floats
function generateCheckboardImage(size) {
  var image = new Uint8Array(4*size*size);
  for(var i = 0; i < size; ++i) {
    for (var j = 0; j < size; ++j) {
      var c = (((i & 0x8) === 0) ^ ((j & 0x8) === 0)) * 255;
      image[(i*size*4)+(j*4)+0] = c;
      image[(i*size*4)+(j*4)+1] = c;
      image[(i*size*4)+(j*4)+2] = c;
      image[(i*size*4)+(j*4)+3] = 255;
    }
  }
  return image;
}

// Compute texture u,v coordinates for a point
function computeTextureCoordinates(point, preventWrap) {
    var theta = Math.atan2(-point[2], point[0]);
    var phi = Math.acos(-point[1]);
    var u = (theta + Math.PI) / (2.0 * Math.PI);
    var v = phi / Math.PI;

    if (preventWrap && u < 0.1) {
      u = 1.0;
    }
    return vec2(u, v);
}

// Generate texture coordinates for a vertex buffer
function generateTextureCoordinateBuffer(vertices) {
  if (vertices.length % 3 !== 0) {
    throw "vertex array not a multiple of 3";
  }
  var index = 0;
  var coordinates = [];
  while (index < vertices.length) {
    var p1 = vertices[index++];
    var p2 = vertices[index++];
    var p3 = vertices[index++];
    var preventWrap = false;

    // test if triangle points wrap around texture
    if (
      ((p1[2] < 0.0 || p2[2] < 0.0 || p3[2] < 0.0) &&
      (p1[2] >= 0.0 || p2[2] >= 0.0 || p3[2] >= 0.0)) ) {
        preventWrap = true;
    }
    coordinates.push(computeTextureCoordinates(p1, preventWrap));
    coordinates.push(computeTextureCoordinates(p2, preventWrap));
    coordinates.push(computeTextureCoordinates(p3, preventWrap));
  }
  return coordinates;
}

// Generate lines for the base grid (10x10)
function baseGrid() {
  var grid = [];
  var size = 10;
  for(var x = -size; x <= size; ++x) {
    grid.push(vec4(x, 0, -size));
    grid.push(vec4(x, 0, size));
  }
  for(var z = -size; z <= size; ++z) {
    grid.push(vec4(-size, 0, z));
    grid.push(vec4(size, 0, z));
  }
  return grid;
}

// Generate triangles for a unit-size cylinder
function unitCylinder() {
  var cylinder = [];
  var divisions = 50;
  var r = 0.5;
  for(var i = 0; i < divisions; ++i) {
    var theta = i/divisions * 2*Math.PI;
    var ntheta = (i+1)/divisions * 2*Math.PI;
    // cone base center to edge
    cylinder.push(vec4(0, -r, 0));
    cylinder.push(vec4(r*Math.cos(theta), -r, r*Math.sin(theta)));
    cylinder.push(vec4(r*Math.cos(ntheta), -r, r*Math.sin(ntheta)));
    // cone top center to edge
    cylinder.push(vec4(0, r, 0));
    cylinder.push(vec4(r*Math.cos(theta), r, r*Math.sin(theta)));
    cylinder.push(vec4(r*Math.cos(ntheta), r, r*Math.sin(ntheta)));

    // cone sides
    for(var j = 0; j < divisions; ++j) {
      var p1 = (divisions-j)/divisions;
      var p2 = (divisions-(j+1))/divisions;
      var y1 = r - (2*r * p1);
      var y2 = r - (2*r * p2);

      cylinder.push(vec4(r*Math.cos(theta), y1, r*Math.sin(theta)));
      cylinder.push(vec4(r*Math.cos(ntheta), y1, r*Math.sin(ntheta)));
      cylinder.push(vec4(r*Math.cos(theta), y2, r*Math.sin(theta)));

      cylinder.push(vec4(r*Math.cos(theta), y2, r*Math.sin(theta)));
      cylinder.push(vec4(r*Math.cos(ntheta), y2, r*Math.sin(ntheta)));
      cylinder.push(vec4(r*Math.cos(ntheta), y1, r*Math.sin(ntheta)));
    }
  }
  return cylinder;
}

// Generate triangles for a unit-size cone
function unitCone() {
  var cone = [];
  var divisions = 50;
  var r = 0.5;
  for(var i = 0; i < divisions; ++i) {
    var theta = i/divisions * 2*Math.PI;
    var ntheta = (i+1)/divisions * 2*Math.PI;
    // cone base center to edge
    cone.push(vec4(0, -r, 0));
    cone.push(vec4(r*Math.cos(theta), -r, r*Math.sin(theta)));
    cone.push(vec4(r*Math.cos(ntheta), -r, r*Math.sin(ntheta)));
    // cone base edge to cone top
    for(var j = 0; j < divisions; ++j) {
      var p1 = (divisions-j)/divisions;
      var p2 = (divisions-(j+1))/divisions;
      var r1 = r * p1;
      var r2 = r * p2;
      var y1 = r - (2*r * p1);
      var y2 = r - (2*r * p2);

      cone.push(vec4(r1*Math.cos(theta), y1, r1*Math.sin(theta)));
      cone.push(vec4(r1*Math.cos(ntheta), y1, r1*Math.sin(ntheta)));
      cone.push(vec4(r2*Math.cos(theta), y2, r2*Math.sin(theta)));

      cone.push(vec4(r1*Math.cos(ntheta), y1, r1*Math.sin(ntheta)));
      cone.push(vec4(r2*Math.cos(ntheta), y2, r2*Math.sin(ntheta)));
      cone.push(vec4(r2*Math.cos(theta), y2, r2*Math.sin(theta)));
    }
  }
  return cone;
}

// Generate lines for displaying a triangle
function triangle(points, a, b, c) {
  points.push(a);
  points.push(b);
  points.push(c);
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

  var p0 = vec4(0.0, 1.0, 0.0);
  var p1 = vec4(0.0, 0.0, 1.0);
  var p2 = vec4(1.0, 0.0, 0.0);
  var p3 = vec4(0.0, 0.0, -1.0);
  var p4 = vec4(-1.0, 0.0, 0.0);
  var p5 = vec4(0.0, -1.0, 0.0);

  divideTriangle(sphere, p0, p1, p2, divisions);
  divideTriangle(sphere, p0, p1, p4, divisions);
  divideTriangle(sphere, p0, p3, p2, divisions);
  divideTriangle(sphere, p0, p3, p4, divisions);
  divideTriangle(sphere, p5, p1, p2, divisions);
  divideTriangle(sphere, p5, p1, p4, divisions);
  divideTriangle(sphere, p5, p3, p2, divisions);
  divideTriangle(sphere, p5, p3, p4, divisions);

  return sphere;
}
