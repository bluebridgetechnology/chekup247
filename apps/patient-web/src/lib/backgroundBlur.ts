/**
 * On-device background effects (blur or a picture) for the video call.
 *
 * Segmentation: MediaPipe Tasks Vision `ImageSegmenter` with the selfie segmenter model, on the GPU
 * where it can (CPU otherwise), self-hosted under /mediapipe. Compositing: a small WebGL2 pipeline
 * that never touches the CPU per pixel:
 *   1. mask refine   - the model's soft (confidence) mask, upsampled with an edge-aware (joint
 *                      bilateral) filter guided by the camera frame so it hugs hair and shoulders,
 *                      then smoothed over time so edges stop shimmering;
 *   2. blur          - background-only, mask-weighted Gaussian blur at 1/4 size (no halo of the
 *                      person bleeding into the blur), or a cover-fitted picture;
 *   3. composite     - person over backdrop with a soft edge.
 * The output canvas becomes a MediaStreamTrack we hand to Daily as a custom video source. Nothing
 * leaves the device. Daily's own processor is desktop-only; this is what makes it work on phones.
 */

import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const WASM_BASE = '/mediapipe/wasm';
const MODEL_URL = '/mediapipe/models/selfie_segmenter.tflite';

/** Whether this browser can run the pipeline at all (WebGL2 + canvas capture + WebAssembly). */
export function backgroundBlurSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const hasCapture = typeof (canvas as any).captureStream === 'function';
    const hasWasm = typeof WebAssembly === 'object';
    const hasGl2 = !!canvas.getContext('webgl2');
    return hasCapture && hasWasm && hasGl2;
  } catch {
    return false;
  }
}

/** Anything we can paint as a backdrop. Decoded once; the pipeline keeps it as a GPU texture. */
export type BackgroundImage = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

export type PipelineBackground =
  | { kind: 'blur'; /** 0..1 — how strongly to blur the background. */ strength: number }
  | { kind: 'image'; image: BackgroundImage };

const MAX_IMAGE_EDGE = 1280;

/**
 * Loads a preset URL or an uploaded file into a canvas no larger than 1280px on its long edge, so a
 * 12-megapixel upload never sits in memory at full size. Rejects if the image can't be decoded.
 */
export async function loadBackgroundImage(source: string | Blob): Promise<HTMLCanvasElement> {
  let decoded: ImageBitmap | HTMLImageElement;
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source;
      decoded = await createImageBitmap(blob);
    } catch {
      decoded = await loadViaImageElement(source);
    }
  } else {
    decoded = await loadViaImageElement(source);
  }
  const iw = 'naturalWidth' in decoded ? decoded.naturalWidth : decoded.width;
  const ih = 'naturalHeight' in decoded ? decoded.naturalHeight : decoded.height;
  if (!iw || !ih) throw new Error('empty image');
  const k = Math.min(1, MAX_IMAGE_EDGE / Math.max(iw, ih));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(iw * k));
  canvas.height = Math.max(1, Math.round(ih * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(decoded, 0, 0, canvas.width, canvas.height);
  if ('close' in decoded) decoded.close();
  return canvas;
}

function loadViaImageElement(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
    const done = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    img.onload = () => {
      done();
      resolve(img);
    };
    img.onerror = () => {
      done();
      reject(new Error('could not load background image'));
    };
    img.src = objectUrl || (source as string);
  });
}

// ---------------------------------------------------------------------------------------------
// Segmenter (one at a time; created per pipeline start, closed on stop)
// ---------------------------------------------------------------------------------------------

let visionModule: Promise<typeof import('@mediapipe/tasks-vision')> | null = null;
let filesetPromise: Promise<any> | null = null;

async function createSegmenter(): Promise<{ segmenter: ImageSegmenter; delegate: 'GPU' | 'CPU' }> {
  if (!visionModule) visionModule = import('@mediapipe/tasks-vision');
  const vision = await visionModule.catch((err) => {
    visionModule = null;
    throw err;
  });
  if (!filesetPromise) filesetPromise = vision.FilesetResolver.forVisionTasks(WASM_BASE);
  const fileset = await filesetPromise.catch((err) => {
    filesetPromise = null;
    throw err;
  });
  const make = (delegate: 'GPU' | 'CPU') =>
    vision.ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  try {
    return { segmenter: await make('GPU'), delegate: 'GPU' };
  } catch (err) {
    console.warn('GPU segmentation unavailable, using CPU:', err);
    return { segmenter: await make('CPU'), delegate: 'CPU' };
  }
}

// ---------------------------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------------------------

// Every texture here is "row 0 = top of the picture". FBO passes keep that; only the final pass to
// the screen flips, because the canvas's bottom row is GL's y = -1.
const VERT = `#version 300 es
in vec2 a_pos;
uniform float u_flipY;
out vec2 v_uv;
void main() {
  float y = a_pos.y * 0.5 + 0.5;
  v_uv = vec2(a_pos.x * 0.5 + 0.5, mix(y, 1.0 - y, u_flipY));
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Joint bilateral upsample of the low-res model mask, guided by the camera frame, plus temporal
// smoothing that snaps on real motion (big change) and calms flicker (small change).
const FRAG_REFINE = `#version 300 es
precision mediump float;
uniform sampler2D u_mask;
uniform sampler2D u_video;
uniform sampler2D u_prev;
uniform vec2 u_step;
uniform float u_hasPrev;
in vec2 v_uv;
out vec4 o;
void main() {
  vec3 c0 = texture(u_video, v_uv).rgb;
  float sum = 0.0;
  float wsum = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 off = vec2(float(x), float(y)) * u_step;
      vec3 d = texture(u_video, v_uv + off).rgb - c0;
      float w = exp(-float(x * x + y * y) * 0.22) * exp(-dot(d, d) * 30.0);
      sum += texture(u_mask, v_uv + off).r * w;
      wsum += w;
    }
  }
  float m = sum / max(wsum, 1e-4);
  if (u_hasPrev > 0.5) {
    float p = texture(u_prev, v_uv).r;
    float a = mix(0.6, 1.0, smoothstep(0.04, 0.25, abs(m - p)));
    m = mix(p, m, a);
  }
  o = vec4(m, 0.0, 0.0, 1.0);
}`;

// Downsample to 1/4 keeping only the background (premultiplied by its weight), so the person's
// colours never smear into the blurred backdrop around them.
const FRAG_DOWN = `#version 300 es
precision mediump float;
uniform sampler2D u_video;
uniform sampler2D u_mask;
uniform vec2 u_texel;
in vec2 v_uv;
out vec4 o;
void main() {
  vec2 h = u_texel * 0.25;
  vec3 c = texture(u_video, v_uv + vec2(-h.x, -h.y)).rgb + texture(u_video, v_uv + vec2(h.x, -h.y)).rgb
         + texture(u_video, v_uv + vec2(-h.x, h.y)).rgb + texture(u_video, v_uv + vec2(h.x, h.y)).rgb;
  float w = 1.0 - smoothstep(0.15, 0.55, texture(u_mask, v_uv).r);
  o = vec4(c * 0.25 * w, w);
}`;

// 9-tap Gaussian in 5 fetches (linear sampling), one direction per pass.
const FRAG_BLUR = `#version 300 es
precision mediump float;
uniform sampler2D u_src;
uniform vec2 u_dir;
in vec2 v_uv;
out vec4 o;
void main() {
  vec4 s = texture(u_src, v_uv) * 0.2270270270;
  s += (texture(u_src, v_uv + u_dir * 1.3846153846) + texture(u_src, v_uv - u_dir * 1.3846153846)) * 0.3162162162;
  s += (texture(u_src, v_uv + u_dir * 3.2307692308) + texture(u_src, v_uv - u_dir * 3.2307692308)) * 0.0702702703;
  o = s;
}`;

const FRAG_COMPOSITE = `#version 300 es
precision mediump float;
uniform sampler2D u_video;
uniform sampler2D u_mask;
uniform sampler2D u_bg;
uniform int u_mode;
uniform vec2 u_bgScale;
uniform vec2 u_bgOffset;
in vec2 v_uv;
out vec4 o;
void main() {
  vec3 fg = texture(u_video, v_uv).rgb;
  float m = texture(u_mask, v_uv).r;
  vec3 bg;
  if (u_mode == 0) {
    vec4 b = texture(u_bg, v_uv);
    bg = mix(fg, b.rgb / max(b.a, 1e-3), smoothstep(0.0, 0.08, b.a));
  } else {
    bg = texture(u_bg, v_uv * u_bgScale + u_bgOffset).rgb;
  }
  float a = smoothstep(0.32, 0.68, m);
  o = vec4(mix(bg, fg, a), 1.0);
}`;

type Program = { prog: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`shader: ${log}`);
  }
  return s;
}

function program(gl: WebGL2RenderingContext, frag: string, uniforms: string[]): Program {
  const prog = gl.createProgram()!;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
  const u: Program['u'] = {};
  for (const name of ['u_flipY', ...uniforms]) u[name] = gl.getUniformLocation(prog, name);
  return { prog, u };
}

function texture(gl: WebGL2RenderingContext): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export interface BlurPipelineOptions {
  /** 0..1 — how strongly to blur the background (used when no `background` is given). */
  strength?: number;
  /** What to put behind the person. Defaults to a blur of `strength`. */
  background?: PipelineBackground;
  /** Called once when the device can't keep up (or the GPU gives out), so the caller can turn it off. */
  onSlow?: () => void;
  /** Stop the camera track passed to start() when the pipeline stops (the call pages own it). */
  stopSourceOnStop?: boolean;
}

export interface PipelineStats {
  /** Frames sent out per second over the last couple of seconds. */
  fps: number;
  /** Average time the model takes per mask, in ms. */
  segmentMs: number;
  /** Where the model runs. */
  delegate: 'GPU' | 'CPU' | null;
  /** Output size. */
  width: number;
  height: number;
}

const OUTPUT_MAX_EDGE = 640;
const TARGET_FPS = 30;

export class BackgroundBlurPipeline {
  private video: HTMLVideoElement | null = null;
  private source: MediaStreamTrack | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private segmenter: ImageSegmenter | null = null;
  private delegate: 'GPU' | 'CPU' | null = null;
  private outTrack: MediaStreamTrack | null = null;
  private running = false;
  private raf = 0;

  private progRefine: Program | null = null;
  private progDown: Program | null = null;
  private progBlur: Program | null = null;
  private progComposite: Program | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private videoTex: WebGLTexture | null = null;
  private rawMaskTex: WebGLTexture | null = null;
  private backdropTex: WebGLTexture | null = null;
  private masks: Target[] = [];
  private maskIndex = 0;
  private hasMask = false;
  private small: Target[] = [];
  private floatTargets = false;
  private maskBytes: Uint8Array | null = null;
  private rawMaskW = 0;
  private rawMaskH = 0;

  private strength = 0.45;
  private bgImage: BackgroundImage | null = null;
  private backdropDirty = false;
  private bgScale: [number, number] = [1, 1];
  private bgOffset: [number, number] = [0, 0];

  private opts: BlurPipelineOptions;
  private lastTick = 0;
  private lastTs = 0;
  private frameNo = 0;
  private segEvery = 1;
  private segAvg = 0;
  private frames = 0;
  private windowStart = 0;
  private fps = 0;
  private slowWindows = 0;
  private slowFired = false;

  constructor(opts: BlurPipelineOptions) {
    this.opts = opts;
    if (opts.background) this.setBackground(opts.background);
    else if (opts.strength !== undefined) this.setBackground({ kind: 'blur', strength: opts.strength });
  }

  setStrength(strength: number) {
    this.setBackground({ kind: 'blur', strength });
  }

  /** Switches between blur and a picture on a running pipeline: no camera or model restart. */
  setBackground(bg: PipelineBackground) {
    if (bg.kind === 'blur') {
      this.strength = Math.min(1, Math.max(0, bg.strength));
      this.bgImage = null;
    } else {
      this.bgImage = bg.image;
      this.backdropDirty = true;
    }
  }

  stats(): PipelineStats {
    return {
      fps: Math.round(this.fps),
      segmentMs: Math.round(this.segAvg * 10) / 10,
      delegate: this.delegate,
      width: this.canvas?.width || 0,
      height: this.canvas?.height || 0,
    };
  }

  /** Starts processing `source` and returns the processed output track. */
  async start(source: MediaStreamTrack): Promise<MediaStreamTrack> {
    this.source = source;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = new MediaStream([source]);
    await video.play().catch(() => {});
    this.video = video;
    await waitFor(() => video.readyState >= 2 && video.videoWidth > 0, 4000);

    const { segmenter, delegate } = await createSegmenter();
    if (!this.video) {
      // stop() was called while the model loaded
      segmenter.close();
      throw new Error('stopped');
    }
    this.segmenter = segmenter;
    this.delegate = delegate;

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.initGl(gl);
    this.resize();

    this.running = true;
    this.windowStart = performance.now();
    this.raf = requestAnimationFrame(this.tick);

    this.outTrack = (canvas as any).captureStream(TARGET_FPS).getVideoTracks()[0];
    // Wait for a first composed frame so the call never flashes an empty picture.
    await waitFor(() => this.hasMask, 4000);
    return this.outTrack!;
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.running = false;
    this.fireSlow();
  };

  private fireSlow() {
    if (this.slowFired) return;
    this.slowFired = true;
    this.opts.onSlow?.();
  }

  private initGl(gl: WebGL2RenderingContext) {
    this.floatTargets = !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    this.progRefine = program(gl, FRAG_REFINE, ['u_mask', 'u_video', 'u_prev', 'u_step', 'u_hasPrev']);
    this.progDown = program(gl, FRAG_DOWN, ['u_video', 'u_mask', 'u_texel']);
    this.progBlur = program(gl, FRAG_BLUR, ['u_src', 'u_dir']);
    this.progComposite = program(gl, FRAG_COMPOSITE, ['u_video', 'u_mask', 'u_bg', 'u_mode', 'u_bgScale', 'u_bgOffset']);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.videoTex = texture(gl);
    this.rawMaskTex = texture(gl);
    this.backdropTex = texture(gl);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  private makeTarget(w: number, h: number, float: boolean): Target {
    const gl = this.gl!;
    const tex = texture(gl);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (float && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      // Some drivers advertise the extension but can't render to it; 8-bit is fine.
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(tex);
      this.floatTargets = false;
      return this.makeTarget(w, h, false);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  private freeTargets() {
    const gl = this.gl;
    if (!gl) return;
    for (const t of [...this.masks, ...this.small]) {
      gl.deleteFramebuffer(t.fbo);
      gl.deleteTexture(t.tex);
    }
    this.masks = [];
    this.small = [];
  }

  /** Sizes the canvas and render targets to the camera frame (capped), e.g. after a phone rotates. */
  private resize(): boolean {
    const video = this.video!;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const k = Math.min(1, OUTPUT_MAX_EDGE / Math.max(vw, vh));
    const w = Math.max(2, Math.round((vw * k) / 2) * 2);
    const h = Math.max(2, Math.round((vh * k) / 2) * 2);
    const canvas = this.canvas!;
    if (canvas.width === w && canvas.height === h && this.masks.length) return false;
    canvas.width = w;
    canvas.height = h;
    this.freeTargets();
    this.masks = [this.makeTarget(w, h, false), this.makeTarget(w, h, false)];
    const sw = Math.max(8, Math.round(w / 4));
    const sh = Math.max(8, Math.round(h / 4));
    this.small = [this.makeTarget(sw, sh, this.floatTargets), this.makeTarget(sw, sh, this.floatTargets)];
    this.hasMask = false;
    this.backdropDirty = !!this.bgImage;
    return true;
  }

  private tick = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (now - this.lastTick < 1000 / TARGET_FPS - 4) return;
    this.lastTick = now;
    const video = this.video;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    try {
      this.render(video, now);
    } catch (err) {
      console.warn('Background effect frame failed:', err);
    }
  };

  private render(video: HTMLVideoElement, now: number) {
    const gl = this.gl!;
    this.resize();
    const { width: w, height: h } = this.canvas!;

    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    if (this.backdropDirty && this.bgImage) this.uploadBackdrop();

    // New mask on this frame? (On slow devices we segment every 2nd/3rd frame and reuse the last.)
    if (!this.hasMask || this.frameNo % this.segEvery === 0) this.segment(video, now);
    this.frameNo += 1;
    const mask = this.masks[this.maskIndex];

    let bgTex: WebGLTexture | null;
    let mode = 0;
    if (this.bgImage && this.backdropTex) {
      bgTex = this.backdropTex;
      mode = 1;
    } else {
      bgTex = this.blurBackground(mask);
    }

    const p = this.progComposite!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(p.prog);
    gl.uniform1f(p.u.u_flipY, 1);
    this.bind(p, 'u_video', 0, this.videoTex);
    this.bind(p, 'u_mask', 1, mask.tex);
    this.bind(p, 'u_bg', 2, bgTex);
    gl.uniform1i(p.u.u_mode, mode);
    gl.uniform2f(p.u.u_bgScale, this.bgScale[0], this.bgScale[1]);
    gl.uniform2f(p.u.u_bgOffset, this.bgOffset[0], this.bgOffset[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.frames += 1;
    this.watchPerformance(now);
  }

  private bind(p: Program, name: string, unit: number, tex: WebGLTexture | null) {
    const gl = this.gl!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(p.u[name], unit);
  }

  private segment(video: HTMLVideoElement, now: number) {
    const gl = this.gl!;
    const seg = this.segmenter;
    if (!seg) return;
    const ts = Math.max(now, this.lastTs + 1);
    this.lastTs = ts;
    const t0 = performance.now();
    const result = seg.segmentForVideo(video, ts);
    try {
      const masks = result.confidenceMasks;
      if (!masks || !masks.length) return;
      // Single-output selfie model: the one mask is the person's confidence.
      const m = masks[masks.length - 1];
      const data = m.getAsFloat32Array();
      const mw = m.width;
      const mh = m.height;
      if (!this.maskBytes || this.maskBytes.length !== data.length) this.maskBytes = new Uint8Array(data.length);
      const bytes = this.maskBytes;
      for (let i = 0; i < data.length; i++) bytes[i] = data[i] * 255;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.rawMaskTex);
      if (mw !== this.rawMaskW || mh !== this.rawMaskH) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mw, mh, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
        this.rawMaskW = mw;
        this.rawMaskH = mh;
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, mw, mh, gl.RED, gl.UNSIGNED_BYTE, bytes);
      }
    } finally {
      result.close();
    }
    const dt = performance.now() - t0;
    this.segAvg = this.segAvg ? this.segAvg * 0.9 + dt * 0.1 : dt;
    // Keep the frame rate up on slow phones: fewer fresh masks, every frame still composited.
    this.segEvery = this.segAvg > 45 ? 3 : this.segAvg > 24 ? 2 : 1;

    // Refine into the next mask target, reading the previous one for temporal smoothing.
    const prev = this.masks[this.maskIndex];
    const next = this.masks[1 - this.maskIndex];
    const p = this.progRefine!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
    gl.viewport(0, 0, next.w, next.h);
    gl.useProgram(p.prog);
    gl.uniform1f(p.u.u_flipY, 0);
    this.bind(p, 'u_mask', 0, this.rawMaskTex);
    this.bind(p, 'u_video', 1, this.videoTex);
    this.bind(p, 'u_prev', 2, prev.tex);
    gl.uniform2f(p.u.u_step, 0.8 / this.rawMaskW, 0.8 / this.rawMaskH);
    gl.uniform1f(p.u.u_hasPrev, this.hasMask ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.maskIndex = 1 - this.maskIndex;
    this.hasMask = true;
  }

  /** Background-only blur at 1/4 size; returns the texture holding it (premultiplied by weight). */
  private blurBackground(mask: Target): WebGLTexture {
    const gl = this.gl!;
    const [a, b] = this.small;
    const down = this.progDown!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
    gl.viewport(0, 0, a.w, a.h);
    gl.useProgram(down.prog);
    gl.uniform1f(down.u.u_flipY, 0);
    this.bind(down, 'u_video', 0, this.videoTex);
    this.bind(down, 'u_mask', 1, mask.tex);
    gl.uniform2f(down.u.u_texel, 1 / a.w, 1 / a.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const blur = this.progBlur!;
    gl.useProgram(blur.prog);
    gl.uniform1f(blur.u.u_flipY, 0);
    const passes = this.strength > 0.7 ? 3 : 2;
    const radius = 1 + this.strength * 1.6;
    for (let i = 0; i < passes; i++) {
      const r = radius * (i + 1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, b.fbo);
      this.bind(blur, 'u_src', 0, a.tex);
      gl.uniform2f(blur.u.u_dir, r / a.w, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, a.fbo);
      this.bind(blur, 'u_src', 0, b.tex);
      gl.uniform2f(blur.u.u_dir, 0, r / a.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    return a.tex;
  }

  /** Uploads the picture once and works out the centre-crop ("cover") for the current output size. */
  private uploadBackdrop() {
    const gl = this.gl!;
    const img = this.bgImage!;
    const iw = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const ih = 'naturalHeight' in img ? img.naturalHeight : img.height;
    this.backdropDirty = false;
    if (!iw || !ih) {
      this.bgImage = null; // unusable picture: fall back to blur rather than showing nothing
      return;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.backdropTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const { width: w, height: h } = this.canvas!;
    const canvasAspect = w / h;
    const imageAspect = iw / ih;
    if (imageAspect > canvasAspect) {
      const s = canvasAspect / imageAspect;
      this.bgScale = [s, 1];
      this.bgOffset = [(1 - s) / 2, 0];
    } else {
      const s = imageAspect / canvasAspect;
      this.bgScale = [1, s];
      this.bgOffset = [0, (1 - s) / 2];
    }
  }

  /** If we sustain < 12 fps for ~4 seconds the device can't carry this: tell the caller. */
  private watchPerformance(now: number) {
    const elapsed = now - this.windowStart;
    if (elapsed < 2000) return;
    this.fps = (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.windowStart = now;
    this.slowWindows = this.fps < 12 ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2) this.fireSlow();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    try {
      this.outTrack?.stop();
    } catch {
      // ignore
    }
    if (this.opts.stopSourceOnStop) {
      try {
        this.source?.stop();
      } catch {
        // ignore
      }
    }
    try {
      this.segmenter?.close();
    } catch {
      // ignore
    }
    if (this.video) {
      try {
        this.video.pause();
      } catch {
        // ignore
      }
      this.video.srcObject = null;
    }
    this.freeTargets();
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
    // Free the GPU context now rather than whenever the garbage collector gets to it.
    try {
      (this.gl?.getExtension('WEBGL_lose_context') as any)?.loseContext();
    } catch {
      // ignore
    }
    this.video = this.canvas = this.gl = null;
    this.segmenter = null;
    this.outTrack = null;
    this.source = null;
    this.bgImage = null;
  }
}

function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (cond() || performance.now() - started > timeoutMs) resolve();
      else setTimeout(check, 30);
    };
    check();
  });
}
