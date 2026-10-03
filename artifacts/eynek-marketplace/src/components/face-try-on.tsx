import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

type Landmark = { x: number; y: number };
type FaceLandmarker = {
  detectForVideo: (video: HTMLVideoElement, time: number) => { faceLandmarks: Landmark[][] };
  close: () => void;
};

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

type VisionModule = {
  FilesetResolver: { forVisionTasks: (base: string) => Promise<unknown> };
  FaceLandmarker: { createFromOptions: (fileset: unknown, options: object) => Promise<FaceLandmarker> };
};

async function loadVision(): Promise<VisionModule> {
  const importer = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<VisionModule>;
  return importer('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/+esm');
}

async function createLandmarker(): Promise<FaceLandmarker> {
  const vision = await loadVision();
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
  const options = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' as const },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
  };
  return vision.FaceLandmarker.createFromOptions(fileset, options);
}

export function FaceTryOn({ imageUrl, productName, onLiveChange }: { imageUrl: string; productName: string; onLiveChange: (live: boolean) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const aliveRef = useRef(true);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'live' | 'blocked'>('idle');
  const [note, setNote] = useState('Kameranı aç və çərçivəni üzündə gör.');

  useEffect(() => {
    const image = new Image();
    image.src = imageUrl;
    imageRef.current = image;
    return () => {
      imageRef.current = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(frameRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      onLiveChange(false);
    };
  }, [onLiveChange]);

  const start = async () => {
    setPhase('starting');
    setNote('Kamera açılır...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video || !aliveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (!aliveRef.current) return;
      setNote('Üz izləmə hazırlanır...');
      const landmarker = await createLandmarker();
      if (!aliveRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setPhase('live');
      setNote('Üzün çərçivədə qalsın.');
      onLiveChange(true);
      const draw = () => {
        const canvas = canvasRef.current;
        const currentVideo = videoRef.current;
        const marker = landmarkerRef.current;
        if (!canvas || !currentVideo || !marker || currentVideo.readyState < 2) {
          frameRef.current = requestAnimationFrame(draw);
          return;
        }
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const srcW = currentVideo.videoWidth;
        const srcH = currentVideo.videoHeight;
        const scale = Math.max(width / srcW, height / srcH);
        const drawnW = srcW * scale;
        const drawnH = srcH * scale;
        const offsetX = (width - drawnW) / 2;
        const offsetY = (height - drawnH) / 2;
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(currentVideo, offsetX, offsetY, drawnW, drawnH);
        ctx.restore();
        const faces = marker.detectForVideo(currentVideo, performance.now()).faceLandmarks;
        const face = faces[0];
        const photo = imageRef.current;
        if (face && photo?.complete && photo.naturalWidth) {
          const point = (index: number) => {
            const mark = face[index];
            return {
              x: width - offsetX - mark.x * srcW * scale,
              y: offsetY + mark.y * srcH * scale,
            };
          };
          const left = point(33);
          const right = point(263);
          const eye = Math.hypot(right.x - left.x, right.y - left.y);
          const frameWidth = eye * 2.4;
          const frameHeight = frameWidth * (photo.naturalHeight / photo.naturalWidth);
          ctx.save();
          ctx.translate((left.x + right.x) / 2, (left.y + right.y) / 2 - eye * 0.28);
          ctx.rotate(Math.atan2(right.y - left.y, right.x - left.x));
          ctx.drawImage(photo, -frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight);
          ctx.restore();
        }
        frameRef.current = requestAnimationFrame(draw);
      };
      frameRef.current = requestAnimationFrame(draw);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'NotFoundError');
      setPhase('blocked');
      setNote(denied ? 'Kameraya icazə verilmədi. Brauzerin kamera icazəsini açıb yenidən cəhd et.' : 'Önizləmə açılmadı. Yenidən cəhd et.');
      onLiveChange(false);
    }
  };

  return (
    <>
      <video ref={videoRef} playsInline muted className="tryon-video" />
      <canvas ref={canvasRef} className="tryon-canvas" />
      {phase !== 'live' && (
        <div className="tryon-start">
          <p>{note}</p>
          <button type="button" className="btn btn-blue" onClick={() => void start()} disabled={phase === 'starting'} data-testid="button-start-camera">
            <Camera size={15} /> {phase === 'starting' ? 'Açılır...' : 'Kameranı aç'}
          </button>
        </div>
      )}
      {phase === 'live' && <div className="provider-state"><Camera size={16} /><span>{productName} · {note}</span></div>}
    </>
  );
}
