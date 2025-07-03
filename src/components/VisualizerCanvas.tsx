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
    let animationId: number;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const barDataArray = new Uint8Array(analyser.frequencyBinCount);

    function drawOscilloscope() {
      if (!analyser || !ctx) return;
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = waveColor;
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        const y = v * (waveHeight / 2) + canvas.height / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    function drawBars() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const bars = 32;
      const barWidth = canvas.width / bars - 4;
      for (let i = 0; i < bars; i++) {
        const value = barDataArray[Math.floor(i * barDataArray.length / bars)];
        const barHeight = (value / 255) * waveHeight;
        ctx.fillStyle = waveColor;
        ctx.fillRect(i * (barWidth + 4), canvas.height - barHeight, barWidth, barHeight);
      }
    }

    function drawCircle() {
      if (!analyser || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      const radius = Math.min(canvas.width, canvas.height) / 4;
      const bars = 32;
      for (let i = 0; i < bars; i++) {
        const value = barDataArray[Math.floor(i * barDataArray.length / bars)];
        const barLength = (value / 255) * (waveHeight + 40);
        const angle = (i / bars) * Math.PI * 2;
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
    }

    function drawRadial() {
      if (!analyser || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      const radius = Math.min(canvas.width, canvas.height) / 4;
      const points = barCount * 4; // More points for smoothness
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dataIdx = Math.floor((i / points) * barDataArray.length);
        const value = barDataArray[dataIdx];
        const r = radius + (value / 255) * (waveHeight + 40);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      if (useGradient && gradientColors && gradientColors.length > 1) {
        // Custom conic gradient
        const grad = ctx.createConicGradient(0, 0, 0);
        gradientColors.forEach((color, i) => {
          grad.addColorStop(i / (gradientColors.length - 1), color);
        });
        ctx.strokeStyle = grad;
      } else if (useGradient) {
        // Rainbow fallback
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

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    return () => {
      if (typeof animationId !== 'undefined' && animationId) cancelAnimationFrame(animationId);
    };
  }, [analyser, isPlaying, waveColor, backgroundColor, waveHeight, lineWidth, visualizationType, width, height, barCount, smoothing, useGradient, gradientColors]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height, background: backgroundColor, borderRadius: 0, marginBottom: 16 }}
    />
  );
});

export default VisualizerCanvas; 