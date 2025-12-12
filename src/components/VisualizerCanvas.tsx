import React, { useRef, useEffect, forwardRef } from 'react';

export type VisualizationType = 'oscilloscope' | 'bars' | 'circle' | 'radial';

interface VisualizerCanvasProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  waveColor: string;
  backgroundColor: string;
  waveHeight: number;
  lineWidth: number;
  width?: number;
  height?: number;
  visualizationType?: VisualizationType;
  barCount?: number;
  smoothing?: number;
  useGradient?: boolean;
  gradientColors?: string[];
}

const VisualizerCanvas = forwardRef<HTMLCanvasElement, VisualizerCanvasProps>(({
  analyser,
  isPlaying,
  waveColor,
  backgroundColor,
  waveHeight,
  lineWidth,
  width = 540,
  height = 200,
  visualizationType = 'oscilloscope',
  barCount = 32,
  smoothing = 0.8,
  useGradient = false,
  gradientColors = ['#ff0000', '#00ff00', '#0000ff'],
}, ref) => {
  const localRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || localRef;

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual display size from container
    const container = canvas.parentElement;
    const displayWidth = container ? container.clientWidth : width;
    const displayHeight = container ? container.clientHeight : height;
    
    // Handle device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const actualWidth = Math.floor(displayWidth * dpr);
    const actualHeight = Math.floor(displayHeight * dpr);

    // Set canvas internal size to match display size with DPR
    if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      // Reset transform and scale context to account for DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    
    // Update canvas CSS size to match container
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    let animationId: number;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const barDataArray = new Uint8Array(analyser.frequencyBinCount);
    let prevBins: number[] | null = null;

    function drawOscilloscope() {
      if (!analyser || !ctx) return;
      analyser.getByteTimeDomainData(dataArray);
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();
      const sliceWidth = displayWidth / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = v * (waveHeight / 2) + displayHeight / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(displayWidth, displayHeight / 2);
      ctx.stroke();
    }

    function drawBars() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);
      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing > 0
          ? smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized
          : normalized;
      }
      prevBins = smoothedBins;
      const bars = Math.max(1, barCount);
      const barWidth = displayWidth / bars - 4;
      for (let i = 0; i < bars; i++) {
        const binStart = Math.floor(i * bins / bars);
        const binEnd = Math.floor((i + 1) * bins / bars);
        let sum = 0;
        let count = 0;
        for (let j = binStart; j < binEnd; j++) {
          sum += smoothedBins[j];
          count++;
        }
        const value = count > 0 ? sum / count : 0;
        const barHeight = value * waveHeight * 8; // align with export scaling
        ctx.fillStyle = waveColor;
        ctx.fillRect(i * (barWidth + 4), displayHeight - barHeight, barWidth, barHeight);
      }
    }

    function drawCircle() {
      if (!analyser || !canvasRef.current) return;
      const ctxCircle = canvasRef.current.getContext('2d');
      if (!ctxCircle) return;
      analyser.getByteFrequencyData(barDataArray);
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      
      ctxCircle.fillStyle = backgroundColor;
      ctxCircle.fillRect(0, 0, displayWidth, displayHeight);
      ctxCircle.save();
      ctxCircle.translate(displayWidth / 2, displayHeight / 2);
      const radius = Math.min(displayWidth, displayHeight) / 4;
      const bars = Math.max(1, barCount);
      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);
      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing > 0
          ? smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized
          : normalized;
      }
      prevBins = smoothedBins;
      for (let i = 0; i < bars; i++) {
        const binStart = Math.floor(i * bins / bars);
        const binEnd = Math.floor((i + 1) * bins / bars);
        let sum = 0;
        let count = 0;
        for (let j = binStart; j < binEnd; j++) {
          sum += smoothedBins[j];
          count++;
        }
        const value = count > 0 ? sum / count : 0;
        const barLength = value * (waveHeight + 40) * 8; // align with export scaling
        const angle = (i / bars) * Math.PI * 2;
        ctxCircle.save();
        ctxCircle.rotate(angle);
        ctxCircle.beginPath();
        if (useGradient && gradientColors && gradientColors.length > 1) {
          const grad = ctxCircle.createLinearGradient(radius, 0, radius + barLength, 0);
          gradientColors.forEach((color, j) => {
            grad.addColorStop(j / (gradientColors.length - 1), color);
          });
          ctxCircle.strokeStyle = grad;
        } else {
          ctxCircle.strokeStyle = waveColor;
        }
        ctxCircle.lineWidth = lineWidth + 1;
        ctxCircle.moveTo(radius, 0);
        ctxCircle.lineTo(radius + barLength, 0);
        ctxCircle.stroke();
        ctxCircle.restore();
      }
      ctxCircle.restore();
    }

    function drawRadial() {
      if (!analyser || !canvasRef.current) return;
      const ctxRadial = canvasRef.current.getContext('2d');
      if (!ctxRadial) return;
      analyser.getByteFrequencyData(barDataArray);
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      
      ctxRadial.fillStyle = backgroundColor;
      ctxRadial.fillRect(0, 0, displayWidth, displayHeight);
      ctxRadial.save();
      ctxRadial.translate(displayWidth / 2, displayHeight / 2);
      const radius = Math.min(displayWidth, displayHeight) / 4;
      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);
      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing > 0
          ? smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized
          : normalized;
      }
      prevBins = smoothedBins;
      const points = bins; // match export: use all bins for ring smoothness
      ctxRadial.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dataIdx = i % bins;
        const value = smoothedBins[dataIdx];
        const r = radius + value * (waveHeight + 40) * 8; // align with export scaling
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) {
          ctxRadial.moveTo(x, y);
        } else {
          ctxRadial.lineTo(x, y);
        }
      }
      ctxRadial.closePath();
      if (useGradient && gradientColors && gradientColors.length > 1) {
        const grad = ctxRadial.createConicGradient(0, 0, 0);
        gradientColors.forEach((color, i) => {
          grad.addColorStop(i / (gradientColors.length - 1), color);
        });
        ctxRadial.strokeStyle = grad;
      } else if (useGradient) {
        const grad = ctxRadial.createConicGradient(0, 0, 0);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(0.16, '#ffff00');
        grad.addColorStop(0.33, '#00ff00');
        grad.addColorStop(0.5, '#00ffff');
        grad.addColorStop(0.66, '#0000ff');
        grad.addColorStop(0.83, '#ff00ff');
        grad.addColorStop(1, '#ff0000');
        ctxRadial.strokeStyle = grad;
      } else {
        ctxRadial.strokeStyle = waveColor;
      }
      ctxRadial.lineWidth = lineWidth + 2;
      ctxRadial.shadowColor = useGradient ? '#fff' : waveColor;
      ctxRadial.shadowBlur = useGradient ? 8 : 0;
      ctxRadial.stroke();
      ctxRadial.restore();
    }

    function draw() {
      if (!ctx) return;
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      if (visualizationType === 'oscilloscope') {
        drawOscilloscope();
      } else if (visualizationType === 'bars') {
        drawBars();
      } else if (visualizationType === 'circle') {
        drawCircle();
      } else if (visualizationType === 'radial') {
        drawRadial();
      }
      if (isPlaying) {
        animationId = requestAnimationFrame(draw);
      }
    }

    if (isPlaying) {
      draw();
    } else {
      const container = canvas.parentElement;
      const displayWidth = container ? container.clientWidth : width;
      const displayHeight = container ? container.clientHeight : height;
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    }

    return () => {
      if (typeof animationId !== 'undefined' && animationId) cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying, waveColor, backgroundColor, waveHeight, lineWidth, visualizationType, width, height, barCount, smoothing, useGradient, gradientColors]);

  return (
    <canvas
      ref={canvasRef}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        background: backgroundColor, 
        borderRadius: 0
      }}
    />
  );
});

export default VisualizerCanvas;
