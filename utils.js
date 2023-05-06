export const createShader = (gl, str, type) => {
  const s = gl.createShader(type);
  gl.shaderSource(s, str);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return false;
  }
  return s;
};

export const createProgram = (gl, vstr, fstr) => {
  const p = gl.createProgram();
  gl.attachShader(p, createShader(gl, vstr, gl.VERTEX_SHADER));
  gl.attachShader(p, createShader(gl, fstr, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
  return p;
};

export const linkProgram = (gl, p) => {
  gl.attachShader(p, createShader(gl, p.vshaderSource, gl.VERTEX_SHADER));
  gl.attachShader(p, createShader(gl, p.fshaderSource, gl.FRAGMENT_SHADER));
  gl.linkProgram(p);
};

export function createTexture(
  gl,
  data,
  width,
  height,
  internatFormat = gl.RGBA32F,
  format = gl.RGBA,
  type = gl.FLOAT
) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    internatFormat,
    width,
    height,
    0,
    format,
    type,
    data
  );
  // nearest / clamp
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export function pingPongFramebuffers(
  framebufferA,
  textureA,
  framebufferB,
  textureB
) {
  // create a reference to access the textures
  const pingpong = {
    back: {
      fb: framebufferA,
      tex: textureA,
    },
    front: {
      fb: framebufferB,
      tex: textureB,
    },
  };
  // utility to swap the 2 buffers
  function swap() {
    // debugger;
    const tmp = pingpong.back;
    pingpong.back = pingpong.front;
    pingpong.front = tmp;
  }
  // return utility object
  return { pingpong, swap };
}

export function createFrameBuffer(gl, tex) {
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  return fb;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

export function loadImageTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 0, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  const image = new Image();
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );

    // WebGL1 has different requirements for power of 2 images
    // vs. non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}