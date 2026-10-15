'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackgroundBlurPipeline,
  backgroundBlurSupported,
  loadBackgroundImage,
  type PipelineBackground,
} from '../../lib/backgroundBlur';
import '../../styles/camera-test.css';

type Mode = 'none' | 'blur-light' | 'blur-heavy' | 'image';

const PRESETS = [
  { id: 'clinic-suite', name: 'Medical Suite', url: '/images/backgrounds/clinic-suite.png' },
  { id: 'modern-office', name: 'Modern Clinic Office', url: '/images/backgrounds/modern-office.png' },
  { id: 'warm-interior', name: 'Warm Living Room', url: '/images/backgrounds/warm-interior.png' },
  { id: 'studio-bokeh', name: 'Studio Soft Bokeh', url: '/images/backgrounds/studio-bokeh.png' },
];

/**
 * Camera test: try the on-device background blur / virtual backgrounds on your own camera, with no
 * booking, payment or video call. Handy for checking a phone before a real consultation.
 */
export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const pipelineRef = useRef<BackgroundBlurPipeline | null>(null);
  const busyRef = useRef(false);
  const modeRef = useRef<Mode>('none');
  const presetRef = useRef<string>(PRESETS[0].id);
  const customFileRef = useRef<File | null>(null);
  const facingRef = useRef<'user' | 'environment'>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [running, setRunning] = useState(false);
  const [mode, setModeState] = useState<Mode>('none');
  const [preset, setPresetState] = useState<string>(PRESETS[0].id);
  const [hasCustom, setHasCustom] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [size, setSize] = useState<string>('');
  const [startMs, setStartMs] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(backgroundBlurSupported());
  }, []);

  // Live frames-per-second of what is on screen
  useEffect(() => {
    const v = videoRef.current;
    if (!running || !v || typeof (v as any).requestVideoFrameCallback !== 'function') return;
    let frames = 0;
    let last = performance.now();
    let handle = 0;
    let stopped = false;
    const onFrame = () => {
      if (stopped) return;
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        setSize(`${v.videoWidth}×${v.videoHeight}`);
        frames = 0;
        last = now;
      }
      handle = (v as any).requestVideoFrameCallback(onFrame);
    };
    handle = (v as any).requestVideoFrameCallback(onFrame);
    return () => {
      stopped = true;
      try {
        (v as any).cancelVideoFrameCallback?.(handle);
      } catch {
        // ignore
      }
    };
  }, [running, mode]);

  const showStream = useCallback((stream: MediaStream | null) => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, []);

  const stopPipeline = useCallback(() => {
    pipelineRef.current?.stop();
    pipelineRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    stopPipeline();
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    showStream(null);
    setRunning(false);
    setFps(null);
    setSize('');
    setStartMs(null);
  }, [showStream, stopPipeline]);

  useEffect(() => () => stopAll(), [stopAll]);

  const resolveBackground = useCallback(async (m: Mode): Promise<PipelineBackground> => {
    if (m === 'image') {
      const source =
        presetRef.current === 'custom'
          ? customFileRef.current
          : PRESETS.find((p) => p.id === presetRef.current)?.url || null;
      if (!source) throw new Error('That background is not available.');
      return { kind: 'image', image: await loadBackgroundImage(source) };
    }
    return { kind: 'blur', strength: m === 'blur-heavy' ? 0.85 : 0.45 };
  }, []);

  const applyMode = useCallback(
    async (m: Mode) => {
      if (busyRef.current) return;
      const cam = camStreamRef.current;
      if (!cam) return;
      busyRef.current = true;
      setProcessing(true);
      setNotice(null);
      try {
        if (m === 'none') {
          stopPipeline();
          showStream(cam);
          modeRef.current = 'none';
          setModeState('none');
          return;
        }
        const background = await resolveBackground(m);
        if (pipelineRef.current) {
          pipelineRef.current.setBackground(background);
        } else {
          const pipeline = new BackgroundBlurPipeline({
            background,
            onSlow: () => {
              setNotice('This device is too slow for background effects, so they were turned off (the same thing happens in a real call).');
              stopPipeline();
              showStream(camStreamRef.current);
              modeRef.current = 'none';
              setModeState('none');
            },
          });
          const t0 = performance.now();
          const out = await pipeline.start(cam.getVideoTracks()[0]);
          setStartMs(Math.round(performance.now() - t0));
          pipelineRef.current = pipeline;
          showStream(new MediaStream([out]));
        }
        modeRef.current = m;
        setModeState(m);
      } catch (err: any) {
        stopPipeline();
        showStream(camStreamRef.current);
        modeRef.current = 'none';
        setModeState('none');
        setNotice(
          err?.message && /not available/i.test(err.message)
            ? err.message
            : 'Could not turn that effect on for this camera.',
        );
      } finally {
        busyRef.current = false;
        setProcessing(false);
      }
    },
    [resolveBackground, showStream, stopPipeline],
  );

  const startCamera = useCallback(
    async (facingMode: 'user' | 'environment', keepMode: Mode = 'none') => {
      setError(null);
      setNotice(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        camStreamRef.current = stream;
        facingRef.current = facingMode;
        setFacing(facingMode);
        showStream(stream);
        setRunning(true);
        if (keepMode !== 'none') await applyMode(keepMode);
      } catch (err: any) {
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow the camera for this site in your browser settings, then try again.'
            : 'We could not open a camera on this device.',
        );
      }
    },
    [applyMode, showStream],
  );

  const flipCamera = useCallback(async () => {
    const keep = modeRef.current;
    stopPipeline();
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    await startCamera(facingRef.current === 'user' ? 'environment' : 'user', keep);
  }, [startCamera, stopPipeline]);

  const pickPreset = (id: string) => {
    presetRef.current = id;
    setPresetState(id);
    applyMode('image');
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) {
      setNotice('Please choose an image (JPG or PNG) under 15 MB.');
      return;
    }
    customFileRef.current = file;
    setHasCustom(true);
    presetRef.current = 'custom';
    setPresetState('custom');
    applyMode('image');
  };

  const fpsClass = fps === null ? '' : fps >= 20 ? 'ct-chip--good' : fps >= 12 ? 'ct-chip--warn' : 'ct-chip--bad';

  return (
    <div className="ct">
      <div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>Camera test</h1>
        <p className="ct-intro">
          Try background blur and virtual backgrounds on your own camera, with no booking or call. Nothing is
          recorded or sent anywhere: it all runs on this device.
        </p>
      </div>

      {!supported && (
        <div className="ct-note ct-note--bad" role="alert">
          This browser cannot run background effects (it needs canvas capture, WebAssembly and WebGL). Try the latest
          Chrome or Safari.
        </div>
      )}
      {error && <div className="ct-note ct-note--bad" role="alert">{error}</div>}
      {notice && <div className="ct-note" role="status">{notice}</div>}

      <div className="ct-stage">
        <video
          ref={videoRef}
          className={`ct-video${facing === 'user' ? ' is-mirrored' : ''}`}
          autoPlay
          playsInline
          muted
        />
        {!running && (
          <div className="ct-empty">
            <span>Your camera preview will show here.</span>
          </div>
        )}
        {running && (
          <div className="ct-stats" aria-live="off">
            {fps !== null && <span className={`ct-chip ${fpsClass}`}>{fps} fps</span>}
            {size && <span className="ct-chip">{size}</span>}
            {startMs !== null && mode !== 'none' && <span className="ct-chip">started in {startMs} ms</span>}
            {processing && <span className="ct-chip">working…</span>}
          </div>
        )}
      </div>

      <div className="ct-row">
        {!running ? (
          <button type="button" className="btn-primary" style={{ minHeight: 48 }} onClick={() => startCamera(facing)}>
            Start camera
          </button>
        ) : (
          <>
            <button type="button" className="btn-secondary" style={{ minHeight: 48 }} onClick={flipCamera}>
              Flip camera
            </button>
            <button type="button" className="btn-secondary" style={{ minHeight: 48 }} onClick={stopAll}>
              Stop
            </button>
          </>
        )}
      </div>

      <section className="ct-card" aria-label="Background effects">
        <div className="ct-label">Background</div>
        <div className="ct-modes">
          {([
            ['none', 'None'],
            ['blur-light', 'Slight blur'],
            ['blur-heavy', 'Strong blur'],
          ] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              type="button"
              className="ct-mode"
              aria-pressed={mode === m}
              disabled={!running || !supported || processing}
              onClick={() => applyMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ct-label">Virtual backgrounds</div>
        <div className="ct-presets">
          {hasCustom && (
            <button
              type="button"
              className="ct-preset"
              aria-pressed={mode === 'image' && preset === 'custom'}
              disabled={!running || processing}
              onClick={() => pickPreset('custom')}
            >
              <span style={{ padding: '26px 8px', textAlign: 'center' }}>Your image</span>
            </button>
          )}
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ct-preset"
              aria-pressed={mode === 'image' && preset === p.id}
              disabled={!running || !supported || processing}
              onClick={() => pickPreset(p.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ minHeight: 44 }}
          disabled={!running || !supported || processing}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload your own image
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
      </section>

      <p className="ct-intro" style={{ fontSize: '0.8rem' }}>
        What to look for: does the edge around you look clean, does the picture stay smooth (aim for 20+ fps), and does
        the phone stay cool? This checks the effect only. A real consultation also sends the picture to the patient
        through our video service.
      </p>
    </div>
  );
}
