/**
 * On-device background blur for the video call.
 *
 * Runs MediaPipe selfie segmentation in the browser (self-hosted under /mediapipe/selfie), keeps the
 * person sharp and blurs everything else on a canvas (or swaps it for a picture), and hands back a
 * MediaStreamTrack to send to Daily as a custom video source. Nothing leaves the device. Works on phones,
 * unlike Daily's built-in processor.
 */

declare global {
  interface Window {
    SelfieSegmentation?: any;
  }
}

const BASE = '/mediapipe/selfie/';

let scriptPromise: Promise<void> | null = null;
function loadRuntime(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.SelfieSegmentation) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${BASE}selfie_segmentation.js`;
      s.async = true;
      s.onload = () => (window.SelfieSegmentation ? resolve() : reject(new Error('runtime missing')));
      s.onerror = () => reject(new Error('could not load background runtime'));
      document.head.appendChild(s);
    }).catch((err) => {
      scriptPromise = null;
      throw err;
    });
  }
  return scriptPromise;
}

/** Whether this browser can run the pipeline at all (canvas capture + WebAssembly + WebGL). */
export function backgroundBlurSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const hasCapture = typeof (canvas as any).captureStream === 'function';
    const hasWasm = typeof WebAssembly === 'object';
    const hasGl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    return hasCapture && hasWasm && hasGl;
  } catch {
    return false;
  }
}

/** Anything we can paint as a backdrop. Decoded once; the pipeline keeps its own pre-scaled copy. */
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

export interface BlurPipelineOptions {
  /** 0..1 — how strongly to blur the background (used when no `background` is given). */
  strength?: number;
  /** What to put behind the person. Defaults to a blur of `strength`. */
  background?: PipelineBackground;
  /** Called once when the device can't keep up, so the caller can switch the effect off. */
  onSlow?: () => void;
}

export class BackgroundBlurPipeline {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private small: HTMLCanvasElement | null = null;
  private smallCtx: CanvasRenderingContext2D | null = null;
  private person: HTMLCanvasElement | null = null;
  private personCtx: CanvasRenderingContext2D | null = null;
  private seg: any = null;
  private outTrack: MediaStreamTrack | null = null;
  private running = false;
  private inFlight = false;
  private raf = 0;
  private strength = 0.45;
  private backdrop: HTMLCanvasElement | null = null; // pre-scaled, cover-fitted picture backdrop
  private bgImage: BackgroundImage | null = null;
  private onSlow?: () => void;
  private frames = 0;
  private windowStart = 0;
  private slowWindows = 0;
  private slowFired = false;

  constructor(opts: BlurPipelineOptions) {
    this.onSlow = opts.onSlow;
    if (opts.background) this.setBackground(opts.background);
    else if (opts.strength !== undefined) this.setBackground({ kind: 'blur', strength: opts.strength });
  }

  setStrength(strength: number) {
    this.setBackground({ kind: 'blur', strength });
  }

  /** Switches between blur and a picture on a running pipeline: no camera or segmentation restart. */
  setBackground(bg: PipelineBackground) {
    if (bg.kind === 'blur') {
      this.strength = Math.min(1, Math.max(0, bg.strength));
      this.bgImage = null;
      this.backdrop = null;
    } else {
      this.bgImage = bg.image;
      this.buildBackdrop();
    }
  }

  /** Centre-crops the picture to the canvas aspect once, so each frame is a single drawImage. */
  private buildBackdrop() {
    const img = this.bgImage;
    const canvas = this.canvas;
    if (!img || !canvas) return; // built in start() once the canvas exists
    const iw = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const ih = 'naturalHeight' in img ? img.naturalHeight : img.height;
    const out = document.createElement('canvas');
    const c = iw && ih ? out.getContext('2d') : null;
    if (!c) {
      // Unusable picture: fall back to blur rather than showing nothing.
      this.bgImage = this.backdrop = null;
      return;
    }
    const { width: w, height: h } = canvas;
    out.width = w;
    out.height = h;
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale;
    const sh = h / scale;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    this.backdrop = out;
  }

  /** Starts processing `source` and returns the blurred output track. */
  async start(source: MediaStreamTrack): Promise<MediaStreamTrack> {
    await loadRuntime();

    const settings = source.getSettings();
    const srcW = settings.width || 640;
    const srcH = settings.height || 480;
    // Cap the working size: segmentation + compositing every frame must stay cheap on phones.
    const scale = Math.min(1, 640 / Math.max(srcW, srcH));
    const w = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const h = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = new MediaStream([source]);
    await video.play().catch(() => {});
    this.video = video;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buildBackdrop();

    // Blur by shrinking then enlarging: no ctx.filter needed (Safari lacks it) and very cheap.
    this.small = document.createElement('canvas');
    this.smallCtx = this.small.getContext('2d');
    this.person = document.createElement('canvas');
    this.person.width = w;
    this.person.height = h;
    this.personCtx = this.person.getContext('2d');

    const seg = new window.SelfieSegmentation!({ locateFile: (f: string) => `${BASE}${f}` });
    seg.setOptions({ modelSelection: 1, selfieMode: false });
    seg.onResults((r: any) => this.compose(r));
    this.seg = seg;
    await seg.initialize();

    this.running = true;
    this.windowStart = performance.now();
    this.loop();

    this.outTrack = (canvas as any).captureStream(24).getVideoTracks()[0];
    // Wait for a first composed frame so the call never flashes an empty picture.
    await new Promise<void>((resolve) => {
      const started = performance.now();
      const check = () => {
        if (this.frames > 0 || performance.now() - started > 4000) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
    return this.outTrack!;
  }

  private loop = () => {
    if (!this.running) return;
    const tick = async () => {
      if (!this.running) return;
      if (!this.inFlight && this.video && this.video.readyState >= 2) {
        this.inFlight = true;
        try {
          await this.seg.send({ image: this.video });
        } catch {
          // a dropped frame is fine
        } finally {
          this.inFlight = false;
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  private compose(results: any) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas || !this.person || !this.personCtx || !this.small || !this.smallCtx) return;
    const { width: w, height: h } = canvas;

    ctx.globalCompositeOperation = 'source-over';
    if (this.backdrop) {
      // 1a. A picture as the backdrop (already cover-fitted to the canvas).
      ctx.drawImage(this.backdrop, 0, 0, w, h);
    } else {
      // 1b. Blurred copy of the whole frame as the backdrop (shrink -> enlarge).
      const divisor = 4 + Math.round(this.strength * 14); // 4..18
      const sw = Math.max(8, Math.round(w / divisor));
      const sh = Math.max(8, Math.round(h / divisor));
      if (this.small!.width !== sw || this.small!.height !== sh) {
        this.small!.width = sw;
        this.small!.height = sh;
      }
      this.smallCtx.imageSmoothingEnabled = true;
      this.smallCtx.drawImage(results.image, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.small, 0, 0, w, h);
    }

    // 2. The person only (frame masked by the segmentation mask)…
    const pc = this.personCtx;
    pc.globalCompositeOperation = 'source-over';
    pc.clearRect(0, 0, w, h);
    pc.drawImage(results.segmentationMask, 0, 0, w, h);
    pc.globalCompositeOperation = 'source-in';
    pc.drawImage(results.image, 0, 0, w, h);

    // 3. …laid over the backdrop.
    ctx.drawImage(this.person, 0, 0, w, h);

    this.frames += 1;
    this.watchPerformance();
  }

  /** If we sustain < 12 fps for ~4 seconds the device can't carry this: tell the caller. */
  private watchPerformance() {
    const now = performance.now();
    const elapsed = now - this.windowStart;
    if (elapsed < 2000) return;
    const fps = (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.windowStart = now;
    this.slowWindows = fps < 12 ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2 && !this.slowFired) {
      this.slowFired = true;
      this.onSlow?.();
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    try {
      this.outTrack?.stop();
    } catch {
      // ignore
    }
    try {
      this.seg?.close?.();
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
    this.video = this.canvas = this.ctx = this.small = this.smallCtx = this.person = this.personCtx = null;
    this.seg = null;
    this.outTrack = null;
    this.backdrop = this.bgImage = null;
  }
}
