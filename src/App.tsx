import React, { useRef, useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Loader2Icon, PlayIcon, PauseIcon } from "lucide-react";
import FileUpload from "./components/FileUpload";
import AudioPlayer from "./components/AudioPlayer";
import VisualizerCanvas from "./components/VisualizerCanvas";
import ControlsPanel from "./components/ControlsPanel";
import BeautyControls from "./components/BeautyControls";
import BackgroundImageUpload from "./components/BackgroundImageUpload";
import Header from "./components/Header";
import VisualizerTypeSelector, { VisualizerType } from "./components/VisualizerTypeSelector";
import ExportPanel from "./components/ExportPanel";
import TipsPanel from "./components/TipsPanel";
import DimensionControls from "./components/DimensionControls";
import PreviewSection from "./components/PreviewSection";
import PropertiesSection from "./components/PropertiesSection";
import { BackgroundType } from '@/utils/backgrounds';
import { adjustBrightness } from '@/utils/beatDetection';
import { calculateDimensionsFromImage, calculateDefaultDimensions } from './utils/dimensions';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [waveColor, setWaveColor] = useState<string>('#1DB954');
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000');
  const [waveHeight, setWaveHeight] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertProgress, setConvertProgress] = useState<number>(0);
  const [lineWidth, setLineWidth] = useState<number>(2);
  const [fps, setFps] = useState<number>(60);
  const [barCount, setBarCount] = useState<number>(32);
  const [smoothing, setSmoothing] = useState<number>(0.8);
  const [useGradient, setUseGradient] = useState<boolean>(false);
  const [lastCircleRadialGradient, setLastCircleRadialGradient] = useState<boolean>(false);
  const [visualizationType, setVisualizationType] = useState<'oscilloscope' | 'bars' | 'circle' | 'radial' | 'organicSphere' | 'nebula' | 'aurora' | 'fireflies' | 'plasma'>('oscilloscope');
  const [gradientColors, setGradientColors] = useState<string[]>(['#ff0000', '#00ff00', '#0000ff']);
  const [isAdvanced, setIsAdvanced] = useState(false);

  // ✨ NEW: Beauty feature states
  const [enableGlow, setEnableGlow] = useState<boolean>(true);
  const [enableParticles, setEnableParticles] = useState<boolean>(false);
  const [enableTrails, setEnableTrails] = useState<boolean>(false);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('none');
  const [mirrorMode, setMirrorMode] = useState<boolean>(false);

  // 📐 NEW: Dimension state (default 16:9 aspect ratio)
  const [canvasWidth, setCanvasWidth] = useState<number>(540);
  const [canvasHeight, setCanvasHeight] = useState<number>(304); // 16:9 = 540/16*9 ≈ 304
  const [autoFitToBackground, setAutoFitToBackground] = useState<boolean>(true); // ON by default

  // 📱 Viewport width for responsive canvas
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Track viewport width changes for responsive canvas sizing
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🖼️ NEW: Background image upload
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const exportProgressTimer = useRef<any>(null);
  const [audioKey, setAudioKey] = useState(0);
  const exportCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  // Ref to signal VisualizerCanvas to draw a frame for export
  const exportFrameRef = useRef<{ trigger: number; drawCount: number }>({ trigger: 0, drawCount: 0 });

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (exportUrl) {
        URL.revokeObjectURL(exportUrl);
      }
      if (exportProgressTimer.current) {
        clearInterval(exportProgressTimer.current);
      }
    };
    // eslint-disable-next-line
  }, []);

  // 📐 Auto-fit dimensions when background image changes and auto-fit is enabled
  useEffect(() => {
    if (autoFitToBackground && backgroundImage) {
      const img = new Image();
      img.onload = () => {
        // Calculate max width based on viewport (mobile: viewport - 32px, tablet: 540px, desktop: 660px)
        let maxWidth: number;
        if (viewportWidth < 640) {
          maxWidth = viewportWidth - 32;
        } else if (viewportWidth < 1280) {
          maxWidth = 540;
        } else {
          maxWidth = 660;
        }
        const dimensions = calculateDimensionsFromImage(img.width, img.height, maxWidth);
        setCanvasWidth(dimensions.width);
        setCanvasHeight(dimensions.height);
      };
      img.src = backgroundImage;
    }
  }, [autoFitToBackground, backgroundImage, viewportWidth]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
      setExportUrl(null);
      setAudioKey(prev => prev + 1);
    }
  };

  // Handle background image upload
  const handleBackgroundImageUpload = (file: File) => {
    setBackgroundImageFile(file);
    const url = URL.createObjectURL(file);
    setBackgroundImage(url);

    // Auto-fit to background image if enabled
    if (autoFitToBackground) {
      const img = new Image();
      img.onload = () => {
        const dimensions = calculateDimensionsFromImage(img.width, img.height);
        setCanvasWidth(dimensions.width);
        setCanvasHeight(dimensions.height);
      };
      img.src = url;
    }
  };

  // Handle background image removal
  const handleBackgroundImageRemove = () => {
    if (backgroundImage) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImageFile(null);
    setBackgroundImage(null);
    setAutoFitToBackground(false); // Disable auto-fit when background is removed
  };

  // Export WebM with real animated wave
  const handleExport = async () => {
    if (!canvasRef.current || !audioFile) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    console.log('[EXPORT] Starting export for visualization type:', visualizationType);

    // Load background image if provided
    let backgroundImageObj: HTMLImageElement | null = null;
    if (backgroundImage) {
      backgroundImageObj = new Image();
      backgroundImageObj.src = backgroundImage;
      await new Promise((resolve) => {
        if (backgroundImageObj!.complete) {
          resolve(null);
        } else {
          backgroundImageObj!.onload = resolve;
        }
      });
    }

    const exportDpr = window.devicePixelRatio || 1;
    const exportCssWidth = canvas.clientWidth || Math.floor(canvas.width / exportDpr) || 540;
    const exportCssHeight = canvas.clientHeight || Math.floor(canvas.height / exportDpr) || 159;
    const exportPixelWidth = Math.floor(exportCssWidth * exportDpr);
    const exportPixelHeight = Math.floor(exportCssHeight * exportDpr);
    if (canvas.width !== exportPixelWidth || canvas.height !== exportPixelHeight) {
      canvas.width = exportPixelWidth;
      canvas.height = exportPixelHeight;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(exportDpr, exportDpr);

    setExportUrl(null);
    setExportProgress(0);
    setIsConverting(false);
    setConvertProgress(0);
    recordedChunksRef.current = [];
    exportCancelRef.current.cancelled = false;

    // Signal that export is in progress (VisualizerCanvas will keep animating)
    setIsExporting(true);

    // Prepare canvas stream (video only, no audio)
    const canvasStream = canvas.captureStream(60); // 60fps
    const videoTracks = canvasStream.getVideoTracks();
    const muteStream = new MediaStream(videoTracks);
    // Setup MediaRecorder
    const mediaRecorder = new MediaRecorder(muteStream, {
      mimeType: 'video/webm',
    });
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    mediaRecorder.onstop = async () => {
      if (exportCancelRef.current.cancelled) {
        setIsExporting(false);
        setExportProgress(0);
        setIsConverting(false);
        setConvertProgress(0);
        return;
      }
      setExportProgress(100);
      const webmBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(webmBlob);
      setExportUrl(url);
      setIsExporting(false);
      setIsConverting(false);
      setConvertProgress(100);
    };
    // Decode audio and animate wave
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(1, 44100 * 60 * 10, 44100); // up to 10min
    const arrayBuffer = await audioFile.arrayBuffer();
    const decodedBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
    const totalDuration = decodedBuffer.duration;
    const bufferLength = 2048;
    const sampleRate = decodedBuffer.sampleRate;
    const numChannels = decodedBuffer.numberOfChannels;
    function getSampleAvg(idx: number) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = decodedBuffer.getChannelData(ch);
        sum += channelData[idx] || 0;
      }
      return sum / numChannels;
    }
    // Lightweight radix-2 FFT for export to mirror live frequency-domain visuals
    function fftMagnitudes(input: Float32Array): Float32Array {
      const n = input.length;
      const levels = Math.log2(n);
      if (Math.floor(levels) !== levels) throw new Error('FFT size must be power of 2');
      const cosTable = new Float32Array(n / 2);
      const sinTable = new Float32Array(n / 2);
      for (let i = 0; i < n / 2; i++) {
        cosTable[i] = Math.cos((2 * Math.PI * i) / n);
        sinTable[i] = Math.sin((2 * Math.PI * i) / n);
      }
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let j = 0;
        for (let bit = 0; bit < levels; bit++) {
          j = (j << 1) | ((i >>> bit) & 1);
        }
        real[j] = input[i];
      }
      for (let size = 2; size <= n; size <<= 1) {
        const halfSize = size >> 1;
        const tableStep = n / size;
        for (let i = 0; i < n; i += size) {
          for (let j = 0; j < halfSize; j++) {
            const k = j * tableStep;
            const tpre = real[i + j + halfSize] * cosTable[k] + imag[i + j + halfSize] * sinTable[k];
            const tpim = -real[i + j + halfSize] * sinTable[k] + imag[i + j + halfSize] * cosTable[k];
            real[i + j + halfSize] = real[i + j] - tpre;
            imag[i + j + halfSize] = imag[i + j] - tpim;
            real[i + j] += tpre;
            imag[i + j] += tpim;
          }
        }
      }
      const mags = new Float32Array(n / 2);
      for (let i = 0; i < n / 2; i++) {
        mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      }
      return mags;
    }

    const totalFrames = Math.ceil(totalDuration * fps);
    let prevWaveform: number[] | null = null;
    let prevBars: number[] | null = null;
    let frameIndex = 0;

    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    function drawExportFrameAccurateByTime(elapsed: number) {
      if (!ctx) return;
      console.log('[EXPORT] === FRAME START ===');
      console.log('[EXPORT] visualizationType:', JSON.stringify(visualizationType));

      // Use exportDpr for proper coordinate system
      ctx.setTransform(exportDpr, 0, 0, exportDpr, 0, 0);

      const t = Math.min(elapsed / totalDuration, 1) * totalDuration;
      setExportProgress(Math.min((t / totalDuration) * 100, 100));

      const width = exportCssWidth;
      const height = exportCssHeight;

      // Helper function to draw background image with cover fit
      const drawBackgroundImage = () => {
        if (!backgroundImageObj || !backgroundImageObj.complete) return;

        const img = backgroundImageObj;
        const canvasRatio = width / height;
        const imgRatio = img.width / img.height;

        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        if (canvasRatio > imgRatio) {
          drawWidth = width;
          drawHeight = width / imgRatio;
          drawX = 0;
          drawY = (height - drawHeight) / 2;
        } else {
          drawHeight = height;
          drawWidth = height * imgRatio;
          drawX = (width - drawWidth) / 2;
          drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      };

      // Calculate energy for this frame (for reactivity)
      let beatInfo = { hasBeat: false, energy: 0, bassEnergy: 0, midEnergy: 0, highEnergy: 0 };

      // Only calculate beat info if we have frequency data
      if (visualizationType === 'bars' || visualizationType === 'circle' || visualizationType === 'radial' ||
          visualizationType === 'organicSphere' || visualizationType === 'nebula' || visualizationType === 'aurora' ||
          visualizationType === 'fireflies' || visualizationType === 'plasma') {
        const samplesPerFrame = Math.floor(sampleRate / fps);
        const frameStart = Math.floor(t * sampleRate);
        const fftSize = 1024;
        const fftInput = new Float32Array(fftSize);

        for (let i = 0; i < fftSize; i++) {
          const idx = frameStart + i;
          fftInput[i] = idx < decodedBuffer.length ? getSampleAvg(idx) : 0;
        }

        const mags = fftMagnitudes(fftInput);
        let maxMag = 0;
        for (let i = 0; i < mags.length; i++) {
          if (mags[i] > maxMag) maxMag = mags[i];
        }

        // Simple energy calculation
        const energy = maxMag > 0 ? Math.min(1, maxMag / 100) : 0;
        beatInfo = {
          hasBeat: energy > 0.3,
          energy: energy,
          bassEnergy: energy,
          midEnergy: energy * 0.8,
          highEnergy: energy * 0.6,
        };
      }

      // Apply trails or clear
      if (enableTrails) {
        ctx.fillStyle = `${backgroundColor}1A`; // 10% opacity for trails
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw background image on top of base background
      if (backgroundImageObj && backgroundImageObj.complete) {
        drawBackgroundImage();
      }

      // Apply glow
      if (enableGlow) {
        ctx.shadowBlur = 15 + beatInfo.energy * 10;
        ctx.shadowColor = waveColor;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.lineWidth = lineWidth;

      console.log('[EXPORT] Switching on visualization type:', visualizationType, 'type:', typeof visualizationType);

      // Check each condition step by step
      const isOscilloscope = visualizationType === 'oscilloscope';
      const isBars = visualizationType === 'bars' || visualizationType === 'circle' || visualizationType === 'radial';
      const isOrganicSphere = visualizationType === 'organicSphere';

      console.log('[EXPORT] isOscilloscope:', isOscilloscope);
      console.log('[EXPORT] isBars:', isBars);
      console.log('[EXPORT] isOrganicSphere:', isOrganicSphere);

      // For new visualization types, VisualizerCanvas handles the animation
      // We skip drawing here to avoid conflicts - MediaRecorder captures the canvas
      if (isOrganicSphere || visualizationType === 'nebula' || visualizationType === 'aurora' || visualizationType === 'fireflies' || visualizationType === 'plasma') {
        console.log('[EXPORT] New visualization type:', visualizationType, '- letting VisualizerCanvas handle drawing');
        return; // Skip drawing, VisualizerCanvas will handle it
      }

      if (isOscilloscope) {
        console.log('[EXPORT] ENTERED oscilloscope branch');
        console.log('[EXPORT] Drawing oscilloscope frame');
        // Oscilloscope waveform with exponential smoothing
        const samplesPerFrame = Math.floor(sampleRate / fps);
        const samplesPerPixel = Math.max(1, Math.floor(samplesPerFrame / width));
        const frameStart = Math.floor(t * sampleRate);
        const waveform: number[] = [];

        for (let x = 0; x < width; x++) {
          let sum = 0;
          let count = 0;
          const start = frameStart + x * samplesPerPixel;
          for (let s = 0; s < samplesPerPixel; s++) {
            const idx = start + s;
            if (idx >= 0 && idx < decodedBuffer.length) {
              sum += getSampleAvg(idx);
              count++;
            }
          }
          const avg = count > 0 ? sum / count : 0;
          waveform[x] = avg;
        }

        if (!prevWaveform) prevWaveform = waveform.slice();
        const smoothed = waveform.map((v, i) => smoothing * (prevWaveform![i] ?? v) + (1 - smoothing) * v);
        prevWaveform = smoothed;

        ctx.beginPath();

        if (mirrorMode) {
          // Mirror mode - draw symmetrical wave (left mirrors right)
          for (let x = 0; x < width / 2; x++) {
            const y = smoothed[x] * (waveHeight / 2 + beatInfo.energy * 20) + height / 2;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          // Mirror to right half
          for (let x = 0; x < width / 2; x++) {
            const mirrorX = width - x;
            const y = smoothed[x] * (waveHeight / 2 + beatInfo.energy * 20) + height / 2;
            ctx.lineTo(mirrorX, y);
          }
        } else {
          // Normal mode - draw full wave across entire width
          for (let x = 0; x < width; x++) {
            const y = smoothed[x] * (waveHeight / 2 + beatInfo.energy * 20) + height / 2;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }

        // Apply gradient or dynamic brightness color
        if (useGradient && gradientColors.length > 1) {
          const gradient = ctx.createLinearGradient(0, 0, width, 0);
          gradientColors.forEach((color, i) => {
            gradient.addColorStop(i / (gradientColors.length - 1), color);
          });
          ctx.strokeStyle = gradient;
        } else {
          // Dynamic brightness
          const brightColor = adjustBrightness(waveColor, 0.8 + beatInfo.energy * 0.4);
          ctx.strokeStyle = brightColor;
        }

        ctx.stroke();
      } else if (visualizationType === 'bars' || visualizationType === 'circle' || visualizationType === 'radial') {
        // Bars/circle/radial visualization with exponential smoothing
        const samplesPerFrame = Math.floor(sampleRate / fps);
        const frameStart = Math.floor(t * sampleRate);
        const fftSize = 1024;
        const fftInput = new Float32Array(fftSize);

        for (let i = 0; i < fftSize; i++) {
          const idx = frameStart + i;
          fftInput[i] = idx < decodedBuffer.length ? getSampleAvg(idx) : 0;
        }

        const mags = fftMagnitudes(fftInput);
        let maxMag = 0;
        for (let i = 0; i < mags.length; i++) {
          if (mags[i] > maxMag) maxMag = mags[i];
        }

        const magsNorm = Array.from(mags, v => (maxMag ? v / maxMag : 0));

        if (!prevBars) prevBars = new Array(magsNorm.length).fill(0);
        const smoothedBins = magsNorm.map((v, i) => smoothing * (prevBars![i] ?? v) + (1 - smoothing) * v);
        prevBars = smoothedBins;

        const barValues: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const binStart = Math.floor(i * smoothedBins.length / barCount);
          const binEnd = Math.floor((i + 1) * smoothedBins.length / barCount);
          let sum = 0;
          let count = 0;
          for (let j = binStart; j < binEnd; j++) {
            sum += smoothedBins[j];
            count++;
          }
          barValues[i] = count > 0 ? sum / count : 0;
        }

        if (visualizationType === 'bars') {
          const barWidth = width / barCount - 4;

          for (let i = 0; i < barCount; i++) {
            const value = barValues[i];
            const reactiveHeight = waveHeight * (1 + beatInfo.bassEnergy * 0.5);
            const barHeight = value * reactiveHeight * 8;

            if (useGradient && gradientColors.length > 1) {
              const gradient = ctx.createLinearGradient(
                i * (barWidth + 4) + barWidth / 2,
                height,
                i * (barWidth + 4) + barWidth / 2,
                height - barHeight
              );
              gradientColors.forEach((color, j) => {
                gradient.addColorStop(j / (gradientColors.length - 1), color);
              });
              ctx.fillStyle = gradient;
            } else {
              const brightColor = adjustBrightness(waveColor, 0.7 + beatInfo.bassEnergy * 0.5);
              ctx.fillStyle = brightColor;
            }

            // Mirror mode draws from center
            if (mirrorMode) {
              const x = width / 2 + (i - barCount / 2) * (barWidth + 4);
              ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            } else {
              ctx.fillRect(i * (barWidth + 4), height - barHeight, barWidth, barHeight);
            }
          }
        } else if (visualizationType === 'circle') {
          ctx.save();
          ctx.translate(width / 2, height / 2);
          const baseRadius = Math.min(width, height) / 4 * (1 + beatInfo.energy * 0.3);

          for (let i = 0; i < barCount; i++) {
            const value = barValues[i];
            const reactiveHeight = waveHeight + 40 + beatInfo.energy * 30;
            const barLength = value * reactiveHeight * 8;
            const angle = (i / barCount) * Math.PI * 2;

            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();

            if (useGradient && gradientColors.length > 1) {
              const gradient = ctx.createLinearGradient(baseRadius, 0, baseRadius + barLength, 0);
              gradientColors.forEach((color, j) => {
                gradient.addColorStop(j / (gradientColors.length - 1), color);
              });
              ctx.strokeStyle = gradient;
            } else {
              const brightColor = adjustBrightness(waveColor, 0.7 + value * 0.5);
              ctx.strokeStyle = brightColor;
            }

            ctx.lineWidth = lineWidth + 1;
            ctx.moveTo(baseRadius, 0);
            ctx.lineTo(baseRadius + barLength, 0);
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        } else if (visualizationType === 'radial') {
          ctx.save();
          ctx.translate(width / 2, height / 2);
          const baseRadius = Math.min(width, height) / 4 * (1 + beatInfo.energy * 0.3);
          const reactiveHeight = waveHeight + 40 + beatInfo.energy * 30;
          const points = smoothedBins.length;

          ctx.beginPath();

          // Always draw the full circle
          for (let i = 0; i <= points; i++) {
            const idx = i % points;
            const value = smoothedBins[idx] ?? 0;

            let r;
            if (mirrorMode && i > points / 2) {
              // Mirror: create symmetrical pattern
              const mirrorIdx = points - i;
              const mirrorValue = smoothedBins[mirrorIdx] ?? 0;
              r = baseRadius + mirrorValue * reactiveHeight * 8;
            } else {
              r = baseRadius + value * reactiveHeight * 8;
            }

            const angle = (i / points) * Math.PI * 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.closePath();

          if (useGradient && gradientColors.length > 1 && ctx.createConicGradient) {
            const gradient = ctx.createConicGradient(0, 0, 0);
            gradientColors.forEach((color, i) => {
              gradient.addColorStop(i / (gradientColors.length - 1), color);
            });
            ctx.strokeStyle = gradient;
          } else {
            const brightColor = adjustBrightness(waveColor, 0.7 + beatInfo.energy * 0.5);
            ctx.strokeStyle = brightColor;
          }

          ctx.stroke();
          ctx.restore();
        }
      }

      frameIndex++;
      console.log(`[EXPORT] Drew frame ${frameIndex}/${totalFrames} for ${visualizationType} at t=${t.toFixed(2)}s`);
    }
    // Real-time export loop using requestAnimationFrame
    function startExportLoop() {
      const startTime = performance.now();
      // Get dimensions
      const width = exportCssWidth;
      const height = exportCssHeight;

      function loop() {
        if (exportCancelRef.current.cancelled) {
          mediaRecorder.stop();
          return;
        }
        const elapsed = (performance.now() - startTime) / 1000;

        // Update progress
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        setExportProgress(progress);

        if (!ctx) {
          requestAnimationFrame(loop);
          return;
        }

        // Calculate beat info for this frame
        let beatInfo = { hasBeat: false, energy: 0, bassEnergy: 0, midEnergy: 0, highEnergy: 0 };
        if (visualizationType !== 'oscilloscope') {
          const samplesPerFrame = Math.floor(sampleRate / fps);
          const frameStart = Math.floor(elapsed * sampleRate);
          const fftSize = 1024;
          const fftInput = new Float32Array(fftSize);
          for (let i = 0; i < fftSize; i++) {
            const idx = frameStart + i;
            fftInput[i] = idx < decodedBuffer.length ? getSampleAvg(idx) : 0;
          }
          const mags = fftMagnitudes(fftInput);
          let maxMag = 0;
          for (let i = 0; i < mags.length; i++) {
            if (mags[i] > maxMag) maxMag = mags[i];
          }
          const energy = maxMag > 0 ? Math.min(1, maxMag / 100) : 0;
          beatInfo = {
            hasBeat: energy > 0.3,
            energy: energy,
            bassEnergy: energy,
            midEnergy: energy * 0.8,
            highEnergy: energy * 0.6,
          };
        }

        // For new visualization types, draw them directly
        if (visualizationType === 'organicSphere') {
          // Clear canvas
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);

          // Draw background image
          if (backgroundImageObj && backgroundImageObj.complete) {
            const img = backgroundImageObj;
            const canvasRatio = width / height;
            const imgRatio = img.width / img.height;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          // Colors matching SiriOrb CSS
          let c1, c2, c3;
          if (useGradient && gradientColors.length >= 3) {
            c1 = gradientColors[0];
            c2 = gradientColors[1];
            c3 = gradientColors[2];
          } else {
            c1 = '#b85dc9'; // purple
            c2 = '#6eb5ff'; // blue
            c3 = '#c46dcd'; // magenta
          }

          const centerX = width / 2;
          const centerY = height / 2;
          const orbSize = Math.min(width, height) * 0.25;
          const time = performance.now() / 1000;

          // Pulse size with beat
          const pulseSize = orbSize * (1 + beatInfo.energy * 0.1);

          ctx.save();
          ctx.translate(centerX, centerY);

          // Create circular clipping region
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
          ctx.clip();

          // ===== SiriOrb background effect - more natural =====
          ctx.globalCompositeOperation = 'screen';
          ctx.filter = 'blur(8px)';

          // Speed based on beat
          const speedMult = 1 + beatInfo.energy * 0.8;

          // Layer 1: c3
          ctx.save();
          ctx.translate(-pulseSize * 0.12, pulseSize * 0.2);
          ctx.rotate(time * 1.0 * speedMult);
          const grad1 = (ctx as any).createConicGradient(0, 0, 0);
          grad1.addColorStop(0, c3);
          grad1.addColorStop(0.05, 'transparent');
          grad1.addColorStop(0.95, 'transparent');
          grad1.addColorStop(1, c3);
          ctx.fillStyle = grad1;
          ctx.beginPath();
          ctx.ellipse(0, 0, pulseSize * 1.15, pulseSize * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Layer 2: c2
          ctx.save();
          ctx.translate(pulseSize * 0.18, -pulseSize * 0.18);
          ctx.rotate(time * 0.7 * speedMult);
          const grad2 = (ctx as any).createConicGradient(0, 0, 0);
          grad2.addColorStop(0, c2);
          grad2.addColorStop(0.06, 'transparent');
          grad2.addColorStop(0.94, 'transparent');
          grad2.addColorStop(1, c2);
          ctx.fillStyle = grad2;
          ctx.beginPath();
          ctx.ellipse(0, 0, pulseSize * 1.05, pulseSize * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Layer 3: c1
          ctx.save();
          ctx.translate(pulseSize * 0.08, pulseSize * 0.3);
          ctx.rotate(time * -1.2 * speedMult);
          const grad3 = (ctx as any).createConicGradient(0, 0, 0);
          grad3.addColorStop(0, c1);
          grad3.addColorStop(0.08, 'transparent');
          grad3.addColorStop(0.92, 'transparent');
          grad3.addColorStop(1, c1);
          ctx.fillStyle = grad3;
          ctx.beginPath();
          ctx.ellipse(0, 0, pulseSize * 1.0, pulseSize * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Layer 4: c2
          ctx.save();
          ctx.translate(-pulseSize * 0.18, -pulseSize * 0.25);
          ctx.rotate(time * 1.8 * speedMult);
          const grad4 = (ctx as any).createConicGradient(0, 0, 0);
          grad4.addColorStop(0, c2);
          grad4.addColorStop(0.04, 'transparent');
          grad4.addColorStop(0.96, 'transparent');
          grad4.addColorStop(1, c2);
          ctx.fillStyle = grad4;
          ctx.beginPath();
          ctx.ellipse(0, 0, pulseSize * 0.95, pulseSize * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Layer 5: c1
          ctx.save();
          ctx.translate(pulseSize * 0.22, pulseSize * 0.2);
          ctx.rotate(time * -0.5 * speedMult);
          const grad5 = (ctx as any).createConicGradient(0, 0, 0);
          grad5.addColorStop(0, c1);
          grad5.addColorStop(0.05, 'transparent');
          grad5.addColorStop(0.95, 'transparent');
          grad5.addColorStop(1, c1);
          ctx.fillStyle = grad5;
          ctx.beginPath();
          ctx.ellipse(0, 0, pulseSize * 0.9, pulseSize * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.filter = 'none';

          // ===== Fluid animated blobs - more natural movement =====
          ctx.filter = 'blur(25px)';
          ctx.globalCompositeOperation = 'lighter';

          const blobCount = 6;
          for (let i = 0; i < blobCount; i++) {
            const t = time * (0.6 + i * 0.2) * (1 + beatInfo.energy * 0.8);
            // Smooth natural movement
            const x = Math.sin(t * 0.7 + i) * pulseSize * 0.45;
            const y = Math.cos(t * 0.5 + i * 0.8) * pulseSize * 0.4;
            const size = pulseSize * (0.85 + Math.sin(t * 0.8 + i * 0.5) * 0.2);

            const color = i % 3 === 0 ? c1 : (i % 3 === 1 ? c2 : c3);
            const alpha = 0.55 + Math.sin(t * 1.2 + i) * 0.15;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.4, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.filter = 'none';

          // ===== Soft inner glow =====
          const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize * 0.75);
          innerGlow.addColorStop(0, `${c1}45`);
          innerGlow.addColorStop(0.5, `${c2}25`);
          innerGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize * 0.75, 0, Math.PI * 2);
          ctx.fill();

          // Subtle outer ring
          const outerRing = ctx.createRadialGradient(0, 0, pulseSize * 0.7, 0, 0, pulseSize);
          outerRing.addColorStop(0, 'transparent');
          outerRing.addColorStop(0.4, `${c3}15`);
          outerRing.addColorStop(1, 'transparent');
          ctx.fillStyle = outerRing;
          ctx.beginPath();
          ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (visualizationType === 'nebula') {
          // Simplified nebula for export - soft center glow with swirling effect
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);

          // Draw background image
          if (backgroundImageObj && backgroundImageObj.complete) {
            const img = backgroundImageObj;
            const canvasRatio = width / height;
            const imgRatio = img.width / img.height;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          // Nebula colors
          let nebulaC1, nebulaC2, nebulaC3;
          if (useGradient && gradientColors.length >= 3) {
            nebulaC1 = gradientColors[0];
            nebulaC2 = gradientColors[1];
            nebulaC3 = gradientColors[2];
          } else {
            nebulaC1 = '#9c43fe'; // purple
            nebulaC2 = '#4cc2e9'; // cyan
            nebulaC3 = '#ff6b9d'; // pink
          }

          const centerX = width / 2;
          const centerY = height / 2;
          const time = performance.now() / 1000;
          const beatPulse = 1 + beatInfo.energy * 0.3;

          // ===== Soft center glow =====
          const glowRadius = 80 * beatPulse;
          const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
          centerGlow.addColorStop(0, `${nebulaC1}60`);
          centerGlow.addColorStop(0.4, `${nebulaC2}40`);
          centerGlow.addColorStop(0.7, `${nebulaC3}20`);
          centerGlow.addColorStop(1, 'transparent');

          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = centerGlow;
          ctx.beginPath();
          ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          // ===== Swirling particles =====
          ctx.filter = 'blur(4px)';
          ctx.globalCompositeOperation = 'lighter';

          const particleCount = 30;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time * 0.3 * beatPulse;
            const dist = 40 + Math.sin(time * 2 + i) * 20 + beatInfo.energy * 30;
            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;
            const size = 3 + beatInfo.energy * 5 + Math.sin(time * 3 + i) * 2;
            const alpha = 0.4 + beatInfo.energy * 0.3;

            const color = i % 2 === 0 ? nebulaC1 : nebulaC2;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.filter = 'none';

          // ===== Outer ring glow =====
          const outerRing = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, 150 * beatPulse);
          outerRing.addColorStop(0, 'transparent');
          outerRing.addColorStop(0.5, `${nebulaC3}15`);
          outerRing.addColorStop(1, 'transparent');
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = outerRing;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 150 * beatPulse, 0, Math.PI * 2);
          ctx.fill();

          // ===== Twinkling stars =====
          const starCount = 50;
          for (let i = 0; i < starCount; i++) {
            const starAngle = Math.random() * Math.PI * 2;
            const starDist = Math.random() * Math.min(width, height) * 0.45;
            const x = centerX + Math.cos(starAngle) * starDist;
            const y = centerY + Math.sin(starAngle) * starDist;
            const size = 0.5 + Math.random() * 1.5;
            const twinkle = Math.sin(time * 2 + i * 0.3) * 0.5 + 0.5;
            const alpha = 0.2 + twinkle * 0.5;

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (visualizationType === 'aurora') {
          // Clear and draw background
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);

          // Draw background image
          if (backgroundImageObj && backgroundImageObj.complete) {
            const img = backgroundImageObj;
            const canvasRatio = width / height;
            const imgRatio = img.width / img.height;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          const time = performance.now() / 1000;
          const centerX = width / 2;
          const centerY = height / 2;

          // Aurora wave bands
          const bandCount = 5;
          ctx.globalCompositeOperation = 'screen';

          for (let band = 0; band < bandCount; band++) {
            const bandY = centerY - height * 0.15 + (band / bandCount) * height * 0.3;
            const bandAlpha = 0.4 - band * 0.06;
            const phaseOffset = band * Math.PI / 4;
            const freqMultiplier = 1 + band * 0.3;

            ctx.beginPath();
            for (let x = 0; x <= width; x += 5) {
              const normalizedX = x / width;
              const wave1 = Math.sin(normalizedX * Math.PI * 2 * freqMultiplier + time * 0.8 + phaseOffset);
              const wave2 = Math.sin(normalizedX * Math.PI * 4 * freqMultiplier + time * 1.2 + phaseOffset);
              const wave = (wave1 + wave2 * 0.5) / 1.5;
              const amplitude = (waveHeight / 3 + beatInfo.energy * 40) * (1 - band * 0.15);
              const y = bandY + wave * amplitude;

              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }

            const hue = 160 + band * 20 + time * 10;
            ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${bandAlpha})`;
            ctx.lineWidth = lineWidth + 3 + band;
            ctx.stroke();
          }

          ctx.globalCompositeOperation = 'source-over';

          // Vertical rays on beat
          if (beatInfo.hasBeat) {
            const rayCount = 8;
            for (let i = 0; i < rayCount; i++) {
              const rayX = width * (0.2 + (i / rayCount) * 0.6);
              const rayHeight = 30 + Math.random() * 50 + beatInfo.energy * 40;
              const gradient = ctx.createLinearGradient(rayX, centerY - rayHeight, rayX, centerY + rayHeight);
              gradient.addColorStop(0, 'transparent');
              gradient.addColorStop(0.5, `hsla(180, 70%, 70%, 0.15)`);
              gradient.addColorStop(1, 'transparent');

              ctx.fillStyle = gradient;
              ctx.fillRect(rayX - 2, centerY - rayHeight, 4, rayHeight * 2);
            }
          }
        } else if (visualizationType === 'fireflies') {
          // Clear and draw background
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);

          // Draw background image
          if (backgroundImageObj && backgroundImageObj.complete) {
            const img = backgroundImageObj;
            const canvasRatio = width / height;
            const imgRatio = img.width / img.height;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          const time = performance.now() / 1000;
          const centerX = width / 2;
          const centerY = height / 2;

          // Ensure valid center coordinates
          const validCenterX = isFinite(centerX) ? centerX : width / 2;
          const validCenterY = isFinite(centerY) ? centerY : height / 2;

          ctx.globalCompositeOperation = 'lighter';

          for (let i = 0; i < 50; i++) {
            // Swarm toward center on beat
            let targetX, targetY;
            if (beatInfo.energy > 0.3) {
              targetX = validCenterX + (Math.random() - 0.5) * width * 0.3;
              targetY = validCenterY + (Math.random() - 0.5) * height * 0.3;
            } else {
              targetX = width * (0.2 + Math.random() * 0.6);
              targetY = height * (0.2 + Math.random() * 0.6);
            }

            // Skip if target is invalid
            if (!isFinite(targetX) || !isFinite(targetY)) {
              targetX = width * 0.5;
              targetY = height * 0.5;
            }

            const phase = Math.atan2(targetY - validCenterY, targetX - validCenterX);
            const dist = Math.sqrt(Math.pow(targetX - validCenterX, 2) + Math.pow(targetY - validCenterY, 2));
            const angle = isFinite(phase) ? phase + time * 0.3 * (1 + beatInfo.energy * 0.8) : time * 0.3;
            const x = validCenterX + Math.cos(angle) * Math.min(isFinite(dist) ? dist : 0, width * 0.4);
            const y = validCenterY + Math.sin(angle) * Math.min(isFinite(dist) ? dist : 0, height * 0.4);

            // Add wandering
            const wanderX = Math.sin(time + i) * 15;
            const wanderY = Math.cos(time + i * 0.7) * 15;

            const pulse = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
            const size = 2 + pulse * 3 + beatInfo.energy * 2;
            const alpha = 0.4 + pulse * 0.5 + beatInfo.energy * 0.3;

            // Ensure valid values
            const validX = isFinite(x) ? x + wanderX : validCenterX;
            const validY = isFinite(y) ? y + wanderY : validCenterY;
            const validSize = isFinite(size) ? Math.max(0.1, size) : 2;

            const gradient = ctx.createRadialGradient(validX, validY, 0, validX, validY, validSize * 2);
            gradient.addColorStop(0, `hsla(52, 100%, 75%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(52, 90%, 55%, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(validX, validY, validSize * 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.globalCompositeOperation = 'source-over';
        } else if (visualizationType === 'plasma') {
          // Clear and draw background
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, width, height);

          // Draw background image
          if (backgroundImageObj && backgroundImageObj.complete) {
            const img = backgroundImageObj;
            const canvasRatio = width / height;
            const imgRatio = img.width / img.height;
            let drawW, drawH, drawX, drawY;
            if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawX = 0;
              drawY = (height - drawH) / 2;
            } else {
              drawH = height;
              drawW = height * imgRatio;
              drawX = (width - drawW) / 2;
              drawY = 0;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }

          const centerX = width / 2;
          const centerY = height / 2;
          const time = performance.now() / 1000;
          const baseRadius = Math.min(width, height) / 4 * (1 + beatInfo.energy * 0.35);

          ctx.globalCompositeOperation = 'screen';

          // Morphing blob layers
          for (let layer = 0; layer < 4; layer++) {
            const layerRadius = baseRadius * (1 - layer * 0.18);
            const points = 80;
            const layerPhase = time * (0.6 + layer * 0.2) + layer * Math.PI / 5;

            ctx.beginPath();
            for (let i = 0; i <= points; i++) {
              const angle = (i / points) * Math.PI * 2;
              const morph1 = Math.sin(angle * 2 + layerPhase);
              const morph2 = Math.sin(angle * 4 - layerPhase * 0.7);
              const morph = (morph1 + morph2 * 0.5) / 1.5;
              const r = layerRadius + morph * (20 + beatInfo.energy * 25);
              const x = centerX + Math.cos(angle) * r;
              const y = centerY + Math.sin(angle) * r;

              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();

            const hue = 270 + layer * 40 + time * 5;
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius * 1.5);
            gradient.addColorStop(0, `hsla(${hue}, 65%, 50%, 0.5)`);
            gradient.addColorStop(0.5, `hsla(${hue + 20}, 55%, 45%, 0.35)`);
            gradient.addColorStop(1, `hsla(${hue + 40}, 45%, 40%, 0)`);

            ctx.fillStyle = gradient;
            ctx.filter = 'blur(8px)';
            ctx.fill();
            ctx.filter = 'none';
          }

          // Floating bubbles on beat
          if (beatInfo.hasBeat) {
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 5; i++) {
              const angle = (i / 5) * Math.PI * 2 + time * 2;
              const dist = baseRadius * (0.5 + Math.random() * 0.5);
              const x = centerX + Math.cos(angle) * dist;
              const y = centerY + Math.sin(angle) * dist;
              const size = 3 + Math.random() * 8;

              const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
              gradient.addColorStop(0, `hsla(${300 + Math.random() * 60}, 80%, 70%, 0.6)`);
              gradient.addColorStop(1, 'transparent');

              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalCompositeOperation = 'screen';
          }

          ctx.globalCompositeOperation = 'source-over';
        } else {
          // Original flow for old visualization types
          drawExportFrameAccurateByTime(elapsed);
        }

        // Force canvas paint
        if (ctx) ctx.getImageData(0, 0, 1, 1);

        if (elapsed < totalDuration) {
          requestAnimationFrame(loop);
        } else {
          setExportProgress(100);
          setTimeout(() => mediaRecorder.stop(), 100);
        }
      }
      loop();
    }
    // Start recording
    mediaRecorder.start();
    startExportLoop();
  };

  const handleCancelExport = () => {
    exportCancelRef.current.cancelled = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsExporting(false);
    setExportProgress(0);
    setIsConverting(false);
    setConvertProgress(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Remember/restore gradient state when switching visualization types
  useEffect(() => {
    if (visualizationType === 'circle' || visualizationType === 'radial') {
      setUseGradient(lastCircleRadialGradient);
    } else {
      if (useGradient) setLastCircleRadialGradient(useGradient);
      setUseGradient(false);
    }
    // eslint-disable-next-line
  }, [visualizationType]);

  // When user toggles gradient in ControlsPanel, update lastCircleRadialGradient if in circle/radial
  const handleSetUseGradient = (v: boolean) => {
    setUseGradient(v);
    if (visualizationType === 'circle' || visualizationType === 'radial') {
      setLastCircleRadialGradient(v);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center p-4 sm:p-6 lg:p-8 xl:p-8">
        <Header />

        {/* Desktop: Two columns (50/50 split), Mobile/Tablet: Single column */}
        <div className="w-full max-w-[1400px] xl:grid xl:grid-cols-2 xl:gap-8 mx-auto">
          {/* Left Column: Upload + Settings */}
          <div className="flex flex-col gap-4 xl:gap-6">
            <div
              className="bg-white rounded shadow-[-2px_2px_0px_0px_#000] w-full px-4 sm:px-6 border-2 border-black"
              style={{
                backgroundColor: '#fff',
                backgroundImage: "url('/square_dot_3x3.svg')",
                backgroundRepeat: 'repeat',
                backgroundSize: '3px 3px',
              }}
            >
              {/* File Upload & Uploaded File Display */}
              <div className="pt-2 sm:pt-4">
                <FileUpload
                  onFileSelected={file => {
                    setAudioFile(file);
                    setAudioUrl(URL.createObjectURL(file));
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setExportUrl(null);
                    setAudioKey(prev => prev + 1);
                  }}
                  disabled={isExporting}
                />
              </div>

              {/* Audio File Info */}
              {audioFile && (
                <div className="bg-yellow-400 flex items-center justify-between p-2 rounded mt-2 mb-2 sm:mb-4"
                     style={{ border: 0, backgroundImage: "url('/tile_file.png')", backgroundRepeat: 'repeat' }}>
                  <div className="flex items-center gap-1">
                    <img src="/audio_file.svg" alt="Audio file" style={{ width: 24, height: 24, display: 'block' }} />
                    <span className="text-xs text-slate-900 font-medium truncate max-w-[200px]">{audioFile.name}</span>
                  </div>
                  <button
                    className="w-4 h-4 ml-2 text-slate-900 hover:text-red-600 transition"
                    onClick={() => {
                      setAudioFile(null);
                      setAudioUrl(null);
                      setIsPlaying(false);
                      setCurrentTime(0);
                      setExportUrl(null);
                      setAudioKey(prev => prev + 1);
                    }}
                    title="Remove file"
                    disabled={isExporting}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <BackgroundImageUpload
                onImageSelected={handleBackgroundImageUpload}
                onRemove={handleBackgroundImageRemove}
                currentImage={backgroundImage}
                currentFile={backgroundImageFile}
                disabled={isExporting}
              />
            </div>

            {/* Properties Section */}
            {audioFile && (
              <PropertiesSection
                visualizationType={visualizationType}
                setVisualizationType={setVisualizationType as (type: VisualizerType) => void}
                isAdvanced={isAdvanced}
                setIsAdvanced={setIsAdvanced}
                waveColor={waveColor}
                setWaveColor={setWaveColor}
                backgroundColor={backgroundColor}
                setBackgroundColor={setBackgroundColor}
                waveHeight={waveHeight}
                setWaveHeight={setWaveHeight}
                lineWidth={lineWidth}
                setLineWidth={setLineWidth}
                fps={fps}
                setFps={setFps}
                isExporting={isExporting}
                exportProgress={exportProgress}
                isConverting={isConverting}
                convertProgress={convertProgress}
                barCount={barCount}
                setBarCount={setBarCount}
                smoothing={smoothing}
                setSmoothing={setSmoothing}
                useGradient={useGradient}
                setUseGradient={handleSetUseGradient}
                gradientColors={gradientColors}
                setGradientColors={setGradientColors}
                enableGlow={enableGlow}
                setEnableGlow={setEnableGlow}
                enableParticles={enableParticles}
                setEnableParticles={setEnableParticles}
                enableTrails={enableTrails}
                setEnableTrails={setEnableTrails}
                backgroundType={backgroundType}
                setBackgroundType={setBackgroundType}
                mirrorMode={mirrorMode}
                setMirrorMode={setMirrorMode}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                autoFitToBackground={autoFitToBackground}
                setAutoFitToBackground={setAutoFitToBackground}
                backgroundImage={backgroundImage}
              />
            )}
          </div>

          {/* Right Column: Preview + Export */}
          <div className="flex flex-col gap-4 xl:gap-6">
            {audioFile && (
              <>
                <PreviewSection
                  canvasRef={canvasRef}
                  analyser={analyser}
                  isPlaying={isPlaying}
                  waveColor={waveColor}
                  backgroundColor={backgroundColor}
                  backgroundImage={backgroundImage}
                  waveHeight={waveHeight}
                  lineWidth={lineWidth}
                  visualizationType={visualizationType}
                  barCount={barCount}
                  smoothing={smoothing}
                  useGradient={useGradient}
                  gradientColors={gradientColors}
                  enableGlow={enableGlow}
                  enableParticles={enableParticles}
                  enableTrails={enableTrails}
                  backgroundType={backgroundType}
                  mirrorMode={mirrorMode}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  audioUrl={audioUrl}
                  onAnalyserReady={setAnalyser}
                  onDuration={setDuration}
                  onCurrentTime={setCurrentTime}
                  onIsPlaying={setIsPlaying}
                  isExporting={isExporting}
                />

                <ExportPanel
                  onExport={handleExport}
                  onDownload={() => {
                    if (exportUrl) {
                      const a = document.createElement('a');
                      a.href = exportUrl;
                      a.download = 'audio-visualizer.webm';
                      a.click();
                    }
                  }}
                  onCancel={handleCancelExport}
                  exporting={isExporting}
                  downloading={false}
                  audioFile={audioFile}
                  exportUrl={exportUrl}
                  exportProgress={exportProgress}
                />
              </>
            )}
            {exportUrl && <TipsPanel />}
          </div>
        </div>
      </div>
    </>
  );
};

export default App; 