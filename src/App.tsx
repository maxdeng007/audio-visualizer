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
import Header from "./components/Header";
import VisualizerTypeSelector, { VisualizerType } from "./components/VisualizerTypeSelector";
import ExportPanel from "./components/ExportPanel";
import TipsPanel from "./components/TipsPanel";

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
  const [visualizationType, setVisualizationType] = useState<'oscilloscope' | 'bars' | 'circle' | 'radial'>('oscilloscope');
  const [gradientColors, setGradientColors] = useState<string[]>(['#ff0000', '#00ff00', '#0000ff']);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const exportProgressTimer = useRef<any>(null);
  const [audioKey, setAudioKey] = useState(0);
  const exportCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

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

  // Export WebM with real animated wave
  const handleExport = async () => {
    if (!canvasRef.current || !audioFile) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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
    setIsExporting(true);
    setExportUrl(null);
    setExportProgress(0);
    setIsConverting(false);
    setConvertProgress(0);
    recordedChunksRef.current = [];
    exportCancelRef.current.cancelled = false;
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
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    function drawExportFrameAccurateByTime(elapsed: number) {
      if (!ctx) return;
      ctx.setTransform(exportDpr, 0, 0, exportDpr, 0, 0);
      ctx.clearRect(0, 0, exportCssWidth, exportCssHeight);
      const t = Math.min(elapsed / totalDuration, 1) * totalDuration;
      setExportProgress(Math.min((t / totalDuration) * 100, 100));
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, exportCssWidth, exportCssHeight);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();
      const width = exportCssWidth;
      const height = exportCssHeight;
      if (visualizationType === 'oscilloscope') {
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
        for (let x = 0; x < width; x++) {
          const y = smoothed[x] * (waveHeight / 2) + height / 2;
        if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
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
        const smoothedBins = magsNorm.map((v, i) => smoothing > 0 ? smoothing * (prevBars![i] ?? v) + (1 - smoothing) * v : v);
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
          for (let i = 0; i < barCount; i++) {
            const barHeight = barValues[i] * waveHeight * 8; // scale for visibility
            const barWidth = width / barCount - 4;
            ctx.fillStyle = waveColor;
            ctx.fillRect(i * (barWidth + 4), height - barHeight, barWidth, barHeight);
          }
        } else if (visualizationType === 'circle') {
          ctx.save();
          ctx.translate(width / 2, height / 2);
          const radius = Math.min(width, height) / 4;
          for (let i = 0; i < barCount; i++) {
            const barLength = barValues[i] * (waveHeight + 40) * 8; // scale for visibility
            const angle = (i / barCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            if (useGradient && gradientColors && gradientColors.length > 1) {
              const grad = ctx.createLinearGradient(radius, 0, radius + barLength, 0);
              gradientColors.forEach((color, j) => {
                grad.addColorStop(j / (gradientColors.length - 1), color);
              });
              ctx.strokeStyle = grad;
            } else {
              ctx.strokeStyle = waveColor;
            }
            ctx.lineWidth = lineWidth + 1;
            ctx.moveTo(radius, 0);
            ctx.lineTo(radius + barLength, 0);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        } else if (visualizationType === 'radial') {
          // Match live radial: use smoothed FFT bins directly for ring
          ctx.save();
          ctx.translate(width / 2, height / 2);
          const radius = Math.min(width, height) / 4;
          const points = smoothedBins.length;
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const idx = i % points;
            const value = smoothedBins[idx] ?? 0;
            const r = radius + value * (waveHeight + 40) * 8;
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
          if (useGradient && gradientColors && gradientColors.length > 1 && ctx.createConicGradient) {
            const grad = ctx.createConicGradient(0, 0, 0);
            gradientColors.forEach((color, i) => {
              grad.addColorStop(i / (gradientColors.length - 1), color);
            });
            ctx.strokeStyle = grad;
          } else if (useGradient && ctx.createConicGradient) {
            const grad = ctx.createConicGradient(0, 0, 0);
            grad.addColorStop(0, '#ff0000');
            grad.addColorStop(0.16, '#ffff00');
            grad.addColorStop(0.33, '#00ff00');
            grad.addColorStop(0.5, '#00ffff');
            grad.addColorStop(0.66, '#0000ff');
            grad.addColorStop(0.83, '#ff00ff');
            grad.addColorStop(1, '#ff0000');
            ctx.strokeStyle = grad;
        } else {
            ctx.strokeStyle = waveColor;
          }
          ctx.lineWidth = lineWidth + 2;
          ctx.shadowColor = useGradient ? '#fff' : waveColor;
          ctx.shadowBlur = useGradient ? 8 : 0;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Real-time export loop using requestAnimationFrame
    function startExportLoop() {
      const startTime = performance.now();
      function loop() {
        if (exportCancelRef.current.cancelled) {
          mediaRecorder.stop();
          return;
        }
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed < totalDuration) {
          drawExportFrameAccurateByTime(elapsed);
          requestAnimationFrame(loop);
      } else {
          drawExportFrameAccurateByTime(totalDuration);
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
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-start p-8">
        <Header />
        <div className="bg-white rounded shadow-[-2px_2px_0px_0px_#000] w-[600px] max-w-full p-6 mx-auto border-2 border-black"
          style={{
            backgroundColor: '#fff',
            backgroundImage: "url('/square_dot_3x3.svg')",
            backgroundRepeat: 'repeat',
            backgroundSize: '3px 3px',
          }}
        >
          {/* File Upload & Uploaded File Display */}
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
        {audioFile && (
            <div className="bg-yellow-400 flex items-center justify-between p-2 rounded mt-2"
                 style={{ border: 0, backgroundImage: "url('/tile_file.png')", backgroundRepeat: 'repeat' }}>
              <div className="flex items-center gap-1">
                {/* Audio file icon */}
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
          {/* Properties Section (Figma precise style) */}
          {audioFile && (
            <div
              className="bg-white rounded p-4 my-6 w-full max-w-[594px] mx-auto"
              style={{
                backgroundColor: '#fff',
                backgroundImage: "url('/square_dot.png')",
                backgroundRepeat: 'repeat',
                backgroundSize: '3px 3px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 className="text-[20px] font-bold text-[#0F172A] mb-4">Properties</h2>
                <div className="flex flex-row gap-2 items-center mb-4">
                  <VisualizerTypeSelector
                    value={visualizationType}
                    onChange={setVisualizationType as (type: VisualizerType) => void}
                    disabled={isExporting}
                  />
                </div>
                {/* Advanced/Simple wrap/unwrap interaction for Properties panel */}
                <div className="flex flex-col gap-0">
                  {/* Collapsed: only show toggle row */}
                  {!isAdvanced && (
                    <div
                      className="flex flex-row gap-2 items-center justify-center cursor-pointer select-none py-2"
                      onClick={() => setIsAdvanced(true)}
                    >
                      <span className="text-[14px] text-black font-normal">Advanced</span>
                      <span className="transition-transform">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 6L8 10L12 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  )}
                  {/* Expanded: show panel, then toggle row at bottom */}
                  {isAdvanced && (
                    <React.Fragment>
                      <ControlsPanel
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
                        onExport={() => {}}
                        isExporting={isExporting}
                        exportProgress={exportProgress}
                        isConverting={isConverting}
                        convertProgress={convertProgress}
                        disabled={isExporting}
                        barCount={barCount}
                        setBarCount={setBarCount}
                        smoothing={smoothing}
                        setSmoothing={setSmoothing}
                        useGradient={useGradient}
                        setUseGradient={handleSetUseGradient}
                        gradientColors={gradientColors}
                        setGradientColors={setGradientColors}
                        visualizationType={visualizationType}
                      />
                      <div
                        className="flex flex-row gap-2 items-center justify-center cursor-pointer select-none py-2"
                        onClick={() => setIsAdvanced(false)}
                        style={{ marginTop: 0 }}
                      >
                        <span className="text-[14px] text-black font-normal">Simple</span>
                        <span className="transition-transform rotate-180">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 6L8 10L12 6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                  </div>
                    </React.Fragment>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Preview Section: styled to match Figma */}
          {audioFile && (
            <div
              className="w-full max-w-[594px] mx-auto rounded relative flex flex-col items-start justify-start p-4"
              style={{
                backgroundColor: '#fff',
                backgroundImage: "url('/square_dot.png')",
                backgroundRepeat: 'repeat',
                backgroundSize: '3px 3px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div className="relative w-full" style={{ position: 'relative', zIndex: 1 }}>
                <div className="font-bold text-[20px] text-[#0F172A] mb-2" style={{ fontFamily: 'Noto Sans, sans-serif' }}>Preview</div>
                {/* Preview window (VisualizerCanvas) */}
                <div className="w-full" style={{ height: 159, borderRadius: 0, position: 'relative', overflow: 'hidden', backgroundColor: backgroundColor, width: '100%' }}>
                  <VisualizerCanvas
                    ref={canvasRef}
                    analyser={analyser}
                    isPlaying={isPlaying}
                    waveColor={waveColor}
                    backgroundColor={backgroundColor}
                    waveHeight={waveHeight}
                    lineWidth={lineWidth}
                    visualizationType={visualizationType}
                    barCount={barCount}
                    smoothing={smoothing}
                    useGradient={useGradient}
                    gradientColors={gradientColors}
                    width={540}
                    height={159}
                  />
                </div>
                {/* Audio Player Controls styled as in Figma */}
                {!isExporting && (
                  <AudioPlayer
                    audioUrl={audioUrl}
                    onAnalyserReady={setAnalyser}
                    onDuration={setDuration}
                    onCurrentTime={setCurrentTime}
                    onIsPlaying={setIsPlaying}
                    isExporting={isExporting}
                  />
        )}
      </div>
    </div>
          )}
          {/* Export & Download Panel */}
          {audioFile && (
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
          )}
          {/* Tips Panel */}
          {exportUrl && <TipsPanel />}
        </div>
      </div>
    </>
  );
};

export default App; 