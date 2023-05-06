import { testSQ } from "./projects/poly";

import {
  createProgram,
  createTexture,
  pingPongFramebuffers,
  createFrameBuffer,
  loadImageTexture,
} from "./utils";

import seed from "./img/seed0500.png";

const vertexShader = `#version 300 es
  in vec2 position;
  void main() {
	  gl_Position = vec4(position, 0, 1);
  }`;

const finalFragShader = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform sampler2D u_t1;
uniform sampler2D u_t2;
out vec4 final;

void main(){
  vec2 uv = gl_FragCoord.xy/u_resolution;
  vec3 result = texture(u_t1,uv).xyz;
  vec3 img = texture(u_t2,1.0-uv).xyz;
  final = vec4(result.r, result.g, result.b, 1.0);
}`;

const feedbackFragShader = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time, u_frame, u_channelSwap;
uniform sampler2D u_t1, u_t2;
out vec4 final;

#define PI 3.14159265359

mat2 rotate2d(float _angle){
  return mat2(cos(_angle),-sin(_angle),
              sin(_angle),cos(_angle));
}

void main(){
  vec2 uv = gl_FragCoord.xy/u_resolution;
  vec2 tc = uv;
  uv *= 0.99;

  uv -= vec2(0.5);
  uv = rotate2d( sin(u_frame*0.0008)*PI ) * uv;
  uv += vec2(0.5);

  vec4 feedbackLayer = texture(u_t2,uv);
  vec4 vibeLayer = texture(u_t1,tc); //поменял местами u_t1 & u_t2
  vec4 sum;
  sum = mix(vibeLayer.rgba, feedbackLayer.rgba, 0.009); //ellipse .009
  if(u_channelSwap > 0.5){
    sum = mix(vibeLayer.rgba, feedbackLayer.grba, 0.009);
  }

  final = vec4(sum.rgb, 1.0);
  //final = vec4(vibeLayer, 1.0);
}`;

/**
 * INIT
 */
let initialFeedbackTex,
  initialFeedbackFB,
  vibeTex,
  vibeFB,
  feedbackTex,
  feedbackFB,
  feedbackPingPong,
  p,
  final,
  feedback,
  positionBuffer,
  q,
  seedImageTexture;

function initProject() {
  seedImageTexture = loadImageTexture(gl, seed);
  // let initialFeedbackTex = createFeedbackInitialData(1024, 1024);
  initialFeedbackTex = createTexture(gl, null, size.w, size.h);
  initialFeedbackFB = createFrameBuffer(gl, initialFeedbackTex);

  vibeTex = createTexture(gl, null, size.w, size.h);
  vibeFB = createFrameBuffer(gl, vibeTex);

  feedbackTex = createTexture(gl, null, size.w, size.h);
  feedbackFB = createFrameBuffer(gl, feedbackTex);

  feedbackPingPong = pingPongFramebuffers(
    initialFeedbackFB,
    initialFeedbackTex,
    feedbackFB,
    feedbackTex
  );

  p = createProgram(gl, vertexShader, fShader);
  final = createProgram(gl, vertexShader, finalFragShader);
  feedback = createProgram(gl, vertexShader, feedbackFragShader);

  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  q = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  gl.bufferData(gl.ARRAY_BUFFER, q, gl.STATIC_DRAW);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // p params
  p.pos = gl.getAttribLocation(p, "position");
  p.res = gl.getUniformLocation(p, "u_resolution");
  p.time = gl.getUniformLocation(p, "u_time");
  p.siize = gl.getUniformLocation(p, "u_siize");
  // final params
  final.pos = gl.getAttribLocation(final, "position");
  final.res = gl.getUniformLocation(final, "u_resolution");
  final.t1 = gl.getUniformLocation(final, "u_t1");
  final.t2 = gl.getUniformLocation(final, "u_t2");
  // feedback params
  feedback.pos = gl.getAttribLocation(feedback, "position");
  feedback.res = gl.getUniformLocation(feedback, "u_resolution");
  feedback.frame = gl.getUniformLocation(feedback, "u_frame");
  feedback.t1 = gl.getUniformLocation(feedback, "u_t1");
  feedback.t2 = gl.getUniformLocation(feedback, "u_t2");
  feedback.channelSwap = gl.getUniformLocation(feedback, "u_channelSwap");
}

// const dpr = window.devicePixelRatio || 1;
const dpr = 2;
const size = {
  w: window.innerWidth * dpr,
  h: window.innerHeight * dpr,
};
const fShader = testSQ;

let feedbackChannelSwap = Math.random();

let index = 0;
let polySides = ["6.0", "5.0", "4.0"];
let a = polySides[index];
let siize = 6.0;

document.body.addEventListener("click", function () {
  a = polySides[index];
  index = (index + 1) % polySides.length;
  siize = a;
});

//  setInterval(function(){siize = Math.random()},1500); //5000,1500 poly
setInterval(function () {
  feedbackChannelSwap = Math.random();
}, 1500);

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl2", {
  alpha: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});

gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

// COMPATIBILITY/EXTENSIONS CHECKUPS
if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
  throw new Error("Cannot use texture in vertex shader");
}
if (!gl.getExtension("EXT_color_buffer_float")) {
  throw new Error("Cannot render to a float frame buffer");
}

initProject();

function updateParams(steps = 1, reverse = false) {
  frame = frame + (reverse ? -steps : steps);
}

/**
 * LOOP
 */
let frame = 0;
let prevTime = Date.now();
let prevFrame = frame;
let pause = false;
let oneStep = false;
let reverse = false;
const tick = () => {
  if (!pause || oneStep) {
    updateParams(oneStep ? 4 : 1, reverse);
    oneStep = false;
    reverse = false;

    gl.bindFramebuffer(gl.FRAMEBUFFER, vibeFB);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, size.w, size.h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(p);
    gl.enableVertexAttribArray(p.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(p.pos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(p.time, frame * 15.0);
    gl.uniform2f(p.res, size.w, size.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1f(p.siize, siize);

    // feedback render

    gl.bindFramebuffer(gl.FRAMEBUFFER, feedbackPingPong.pingpong.front.fb);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.useProgram(feedback);
    gl.enableVertexAttribArray(feedback.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(feedback.pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(feedback.res, size.w, size.h);
    gl.uniform1f(feedback.frame, frame);
    gl.uniform1i(feedback.t1, 0);
    gl.uniform1i(feedback.t2, 1);
    gl.uniform1f(feedback.channelSwap, feedbackChannelSwap);
    // gl.uniform1f(feedback.channelSwap, 0.0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, feedbackPingPong.pingpong.back.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, vibeTex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // final render
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawBuffers([gl.BACK]);
    gl.useProgram(final);
    gl.enableVertexAttribArray(final.pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(final.pos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(final.res, size.w, size.h);
    gl.uniform1i(final.t1, 0);
    gl.uniform1i(final.t2, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, feedbackPingPong.pingpong.back.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, seedImageTexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    feedbackPingPong.swap();
  }
  requestAnimationFrame(tick);

  // frame counter
  if (frame % 100 === 0) {
    console.log(
      "fps:",
      Math.round((frame - prevFrame) / ((Date.now() - prevTime) / 1000))
    );
    prevTime = Date.now();
    prevFrame = frame;
  }
};

tick(0);

/**
 * EVENTS
 */
const last = { width: 0, height: 0 };
let w, h, rect;

const isDifferent = (a, b) => a.width != b.width || a.height != b.height;
const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    rect = entry.contentRect;
    if (isDifferent(last, rect)) {
      last.width = rect.width;
      last.height = rect.height;
      w = Math.floor(rect.width * dpr);
      h = Math.floor(rect.height * dpr);
      size.w = w;
      size.h = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(final.res, w, h);
      oneStep = true;
      // frame = 0;
      // update textures
      initProject();
    }
  }
});

resizeObserver.observe(document.documentElement);

const fullscreen = (event) => {
  const d = document.documentElement;
  if (d.requestFullscreen) {
    d.requestFullscreen();
  } else if (d.webkitRequestFullScreen) {
    d.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  }
};

document.body.addEventListener("dblclick", fullscreen);

const keyHandler = (event) => {
  if (event.key === "f") {
    fullscreen();
  } else if (event.key === "p") {
    pause = !pause;
  } else if (event.key === "[") {
    oneStep = true;
    reverse = true;
  } else if (event.key === "]") {
    oneStep = true;
  }
};
document.addEventListener("keypress", keyHandler);
