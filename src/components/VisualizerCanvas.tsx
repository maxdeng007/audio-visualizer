import React, { useRef, useEffect, forwardRef, useState } from 'react';
import { BeatDetector, adjustBrightness } from '@/utils/beatDetection';
import { ParticleSystem } from '@/utils/particles';
import { BackgroundVisualizer, BackgroundType } from '@/utils/backgrounds';
import { createGradientStops } from '@/utils/palettes';
import SiriOrb from './ui/SiriOrb';

export type VisualizationType = 'oscilloscope' | 'bars' | 'circle' | 'radial' | 'organicSphere' | 'nebula' | 'aurora' | 'fireflies' | 'plasma';

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
  // New beauty props
  enableGlow?: boolean;
  enableParticles?: boolean;
  enableTrails?: boolean;
  backgroundType?: BackgroundType;
  mirrorMode?: boolean;
  // Background image prop
  backgroundImage?: string | null;
  // Export mode flag
  isExporting?: boolean;
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
  // New beauty props
  enableGlow = true,
  enableParticles = false,
  enableTrails = false,
  backgroundType = 'none',
  mirrorMode = false,
  backgroundImage = null,
  isExporting = false,
}, ref) => {
  const localRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || localRef;

  // Time tracking for organic animations
  const [time, setTime] = useState(0);

  // Beat energy for Siri Orb reactivity
  const [orbEnergy, setOrbEnergy] = useState(0);

  // Persistent state for Nebula clouds
  const nebulaClouds = useRef<any[]>([]);
  const nebulaInitialized = useRef(false);

  // Persistent state for Fireflies
  const fireflies = useRef<any[]>([]);
  const firefliesInitialized = useRef(false);

  // Track previous visualization type to reset state when switching
  const prevVizType = useRef<VisualizationType | null>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement;
    const displayWidth = container ? container.clientWidth : (width || 540);
    const displayHeight = container ? container.clientHeight : height;

    const dpr = window.devicePixelRatio || 1;
    const actualWidth = Math.floor(displayWidth * dpr);
    const actualHeight = Math.floor(displayHeight * dpr);

    if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Initialize beauty systems
    const beatDetector = new BeatDetector();
    const particleSystem = new ParticleSystem();
    const backgroundVisualizer = new BackgroundVisualizer();

    // Load background image if provided
    let backgroundImageObj: HTMLImageElement | null = null;
    if (backgroundImage) {
      backgroundImageObj = new Image();
      backgroundImageObj.src = backgroundImage;
    }

    // Helper function to draw background image with cover fit
    const drawBackgroundImage = () => {
      if (!backgroundImageObj || !backgroundImageObj.complete) return;

      const img = backgroundImageObj;
      const canvasRatio = displayWidth / displayHeight;
      const imgRatio = img.width / img.height;

      let drawWidth: number;
      let drawHeight: number;
      let drawX: number;
      let drawY: number;

      if (canvasRatio > imgRatio) {
        // Canvas is wider than image
        drawWidth = displayWidth;
        drawHeight = displayWidth / imgRatio;
        drawX = 0;
        drawY = (displayHeight - drawHeight) / 2;
      } else {
        // Canvas is taller than image
        drawHeight = displayHeight;
        drawWidth = displayHeight * imgRatio;
        drawX = (displayWidth - drawWidth) / 2;
        drawY = 0;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    };

    // Initialize Nebula clouds
    const initNebula = () => {
      if (nebulaInitialized.current) return;
      nebulaInitialized.current = true;

      const containerWidth = canvas.parentElement?.clientWidth || 540;
      const containerHeight = height || canvas.parentElement?.clientHeight || 200;

      for (let i = 0; i < 10; i++) {
        nebulaClouds.current.push({
          x: Math.random() * containerWidth,
          y: Math.random() * containerHeight,
          radius: 60 + Math.random() * 90,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.25,
          hue: Math.random() * 360,
          alpha: 0.015 + Math.random() * 0.025
        });
      }
    };

    // Initialize Fireflies
    const initFireflies = () => {
      if (firefliesInitialized.current) return;
      firefliesInitialized.current = true;

      const containerWidth = canvas.parentElement?.clientWidth || 540;
      const containerHeight = height || canvas.parentElement?.clientHeight || 200;

      for (let i = 0; i < 50; i++) {
        fireflies.current.push({
          x: Math.random() * containerWidth,
          y: Math.random() * containerHeight,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }
    };

    // Reset state when switching visualization types
    if (prevVizType.current && prevVizType.current !== visualizationType) {
      // Clear particle system when switching
      particleSystem.clear();
    }
    prevVizType.current = visualizationType;

    let animationId: number;

    // Function to resize canvas to match container
    const resizeCanvas = () => {
      if (!canvas.parentElement) return;

      const containerDisplayWidth = canvas.parentElement.clientWidth;
      const containerDisplayHeight = height || canvas.parentElement.clientHeight;

      const dpr = window.devicePixelRatio || 1;
      const actualWidth = Math.floor(containerDisplayWidth * dpr);
      const actualHeight = Math.floor(containerDisplayHeight * dpr);

      if (canvas.width !== actualWidth || canvas.height !== actualHeight) {
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      canvas.style.width = `${containerDisplayWidth}px`;
      canvas.style.height = `${containerDisplayHeight}px`;
    };

    // Initial resize
    resizeCanvas();

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    if (container) {
      resizeObserver.observe(container);
    }

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const barDataArray = new Uint8Array(analyser.frequencyBinCount);
    let prevWaveform: number[] | null = null;
    let prevBins: number[] | null = null;

    function drawOscilloscope() {
      if (!analyser || !ctx) return;
      analyser.getByteTimeDomainData(dataArray);

      // Detect beat for reactivity
      const beatInfo = beatDetector.analyze(barDataArray);

      // Draw background image first
      if (backgroundImageObj && backgroundImageObj.complete) {
        drawBackgroundImage();
      }

      // Apply trails or clear canvas completely
      if (enableTrails) {
        ctx.fillStyle = `${backgroundColor}1A`; // 10% opacity
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      } else {
        // Always clear with solid color when trails are off
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Redraw background image on top of clear
        if (backgroundImageObj && backgroundImageObj.complete) {
          drawBackgroundImage();
        }
      }

      // Draw background
      backgroundVisualizer.draw(ctx, displayWidth, displayHeight, backgroundType, beatInfo.energy);

      // Apply glow
      if (enableGlow) {
        ctx.shadowBlur = 15 + beatInfo.energy * 10;
        ctx.shadowColor = waveColor;
      } else {
        ctx.shadowBlur = 0;
      }

      // Convert and smooth waveform
      const waveform: number[] = [];
      for (let i = 0; i < bufferLength; i++) {
        waveform[i] = (dataArray[i] - 128) / 128;
      }

      if (!prevWaveform) prevWaveform = waveform.slice();
      const smoothed = waveform.map((v, i) => {
        const prev = prevWaveform![i] ?? v;
        return smoothing * prev + (1 - smoothing) * v;
      });
      prevWaveform = smoothed;

      // Draw with gradient or solid color
      ctx.lineWidth = lineWidth + (beatInfo.hasBeat ? 2 : 0);
      ctx.beginPath();

      if (mirrorMode) {
        // Mirror mode - draw symmetrical wave (left mirrors right)
        const sliceWidth = displayWidth / bufferLength;

        // Draw left half (0 to center)
        for (let i = 0; i < bufferLength / 2; i++) {
          const x = i * sliceWidth;
          const y = smoothed[i] * (waveHeight / 2 + beatInfo.energy * 20) + displayHeight / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Mirror to right half (center to end)
        for (let i = 0; i < bufferLength / 2; i++) {
          const x = displayWidth / 2 + (displayWidth / 2 - (i * sliceWidth));
          const y = smoothed[i] * (waveHeight / 2 + beatInfo.energy * 20) + displayHeight / 2;
          ctx.lineTo(x, y);
        }
      } else {
        // Normal mode - draw full wave across entire width
        const sliceWidth = displayWidth / bufferLength;

        for (let i = 0; i < bufferLength; i++) {
          const x = i * sliceWidth;
          const y = smoothed[i] * (waveHeight / 2 + beatInfo.energy * 20) + displayHeight / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      // Apply gradient or solid color
      if (useGradient && gradientColors.length > 1) {
        const gradient = ctx.createLinearGradient(0, 0, displayWidth, 0);
        gradientColors.forEach((color, i) => {
          gradient.addColorStop(i / (gradientColors.length - 1), color);
        });
        ctx.strokeStyle = gradient;
      } else {
        // Dynamic brightness based on energy
        const brightColor = adjustBrightness(waveColor, 0.8 + beatInfo.energy * 0.4);
        ctx.strokeStyle = brightColor;
      }

      ctx.stroke();

      // Spawn sparks on beat
      if (beatInfo.hasBeat && enableParticles) {
        for (let i = 0; i < 5; i++) {
          const x = Math.random() * displayWidth;
          const y = displayHeight / 2;
          particleSystem.spawnSparks(x, y, 3, waveColor);
        }
      }
    }

    function drawBars() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Draw background image first
      if (backgroundImageObj && backgroundImageObj.complete) {
        drawBackgroundImage();
      }

      if (enableTrails) {
        ctx.fillStyle = `${backgroundColor}1A`;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      } else {
        // Always clear with solid color when trails are off
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Redraw background image on top of clear
        if (backgroundImageObj && backgroundImageObj.complete) {
          drawBackgroundImage();
        }
      }

      backgroundVisualizer.draw(ctx, displayWidth, displayHeight, backgroundType, beatInfo.energy);

      if (enableGlow) {
        ctx.shadowBlur = 15 + beatInfo.bassEnergy * 10;
        ctx.shadowColor = waveColor;
      }

      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);

      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized;
      }
      prevBins = smoothedBins;

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

      const barWidth = displayWidth / barCount - 4;

      for (let i = 0; i < barCount; i++) {
        const value = barValues[i];
        const reactiveHeight = waveHeight * (1 + beatInfo.bassEnergy * 0.5);
        const barHeight = value * reactiveHeight * 8;

        if (useGradient && gradientColors.length > 1) {
          const gradient = ctx.createLinearGradient(
            i * (barWidth + 4) + barWidth / 2,
            displayHeight,
            i * (barWidth + 4) + barWidth / 2,
            displayHeight - barHeight
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
          const x = displayWidth / 2 + (i - barCount / 2) * (barWidth + 4);
          ctx.fillRect(x, displayHeight - barHeight, barWidth, barHeight);
        } else {
          ctx.fillRect(i * (barWidth + 4), displayHeight - barHeight, barWidth, barHeight);
        }

        // Spawn sparks on beat from top bars
        if (beatInfo.hasBeat && value > 0.7 && enableParticles) {
          const x = mirrorMode
            ? displayWidth / 2 + (i - barCount / 2) * (barWidth + 4) + barWidth / 2
            : i * (barWidth + 4) + barWidth / 2;
          const y = displayHeight - barHeight;
          particleSystem.spawnSparks(x, y, 2, waveColor);
        }
      }
    }

    function drawCircle() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Draw background image first
      if (backgroundImageObj && backgroundImageObj.complete) {
        drawBackgroundImage();
      }

      if (enableTrails) {
        ctx.fillStyle = `${backgroundColor}1A`;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      } else {
        // Always clear with solid color when trails are off
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Redraw background image on top of clear
        if (backgroundImageObj && backgroundImageObj.complete) {
          drawBackgroundImage();
        }
      }

      backgroundVisualizer.draw(ctx, displayWidth, displayHeight, backgroundType, beatInfo.energy);

      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);

      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized;
      }
      prevBins = smoothedBins;

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

      ctx.save();
      ctx.translate(displayWidth / 2, displayHeight / 2);

      const baseRadius = Math.min(displayWidth, displayHeight) / 4 * (1 + beatInfo.energy * 0.3);

      for (let i = 0; i < barCount; i++) {
        const value = barValues[i];
        const reactiveHeight = waveHeight + 40 + beatInfo.energy * 30;
        const barLength = value * reactiveHeight * 8;
        const angle = (i / barCount) * Math.PI * 2;

        ctx.save();
        ctx.rotate(angle);

        if (enableGlow) {
          ctx.shadowBlur = 10 + value * 10;
          ctx.shadowColor = waveColor;
        }

        ctx.lineWidth = lineWidth + 1;
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

        ctx.moveTo(baseRadius, 0);
        ctx.lineTo(baseRadius + barLength, 0);
        ctx.stroke();
        ctx.restore();

        // Sparks on beat
        if (beatInfo.hasBeat && value > 0.8 && enableParticles) {
          const x = displayWidth / 2 + Math.cos(angle) * (baseRadius + barLength);
          const y = displayHeight / 2 + Math.sin(angle) * (baseRadius + barLength);
          particleSystem.spawnSparks(x, y, 2, waveColor);
        }
      }

      ctx.restore();
    }

    function drawRadial() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Draw background image first
      if (backgroundImageObj && backgroundImageObj.complete) {
        drawBackgroundImage();
      }

      if (enableTrails) {
        ctx.fillStyle = `${backgroundColor}1A`;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      } else {
        // Always clear with solid color when trails are off
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Redraw background image on top of clear
        if (backgroundImageObj && backgroundImageObj.complete) {
          drawBackgroundImage();
        }
      }

      backgroundVisualizer.draw(ctx, displayWidth, displayHeight, backgroundType, beatInfo.energy);

      const bins = barDataArray.length;
      const maxVal = Math.max(1, ...barDataArray);
      if (!prevBins || prevBins.length !== bins) prevBins = new Array(bins).fill(0);

      const smoothedBins = new Array(bins);
      for (let i = 0; i < bins; i++) {
        const normalized = barDataArray[i] / maxVal;
        smoothedBins[i] = smoothing * (prevBins[i] ?? normalized) + (1 - smoothing) * normalized;
      }
      prevBins = smoothedBins;

      ctx.save();
      ctx.translate(displayWidth / 2, displayHeight / 2);

      const baseRadius = Math.min(displayWidth, displayHeight) / 4 * (1 + beatInfo.energy * 0.3);
      const reactiveHeight = waveHeight + 40 + beatInfo.energy * 30;
      const points = smoothedBins.length;

      ctx.beginPath();

      // Always draw the full circle
      for (let i = 0; i <= points; i++) {
        const idx = i % points;
        const value = smoothedBins[idx] ?? 0;

        let r, angle;
        if (mirrorMode && i > points / 2) {
          // Mirror: create symmetrical pattern
          const mirrorIdx = points - i;
          const mirrorValue = smoothedBins[mirrorIdx] ?? 0;
          r = baseRadius + mirrorValue * reactiveHeight * 8;
        } else {
          r = baseRadius + value * reactiveHeight * 8;
        }

        angle = (i / points) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      if (enableGlow) {
        ctx.shadowBlur = 20 + beatInfo.energy * 10;
        ctx.shadowColor = waveColor;
      }

      ctx.lineWidth = lineWidth;

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

    function drawOrganicSphere() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Update orb energy for SiriOrb reactivity
      setOrbEnergy(beatInfo.energy);

      // During export, App.tsx handles the drawing
      if (isExporting) {
        return;
      }

      // Draw background for preview
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw background image
      if (backgroundImageObj && backgroundImageObj.complete) {
        const img = backgroundImageObj;
        const canvasRatio = displayWidth / displayHeight;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawWidth = displayWidth;
          drawHeight = displayWidth / imgRatio;
          drawX = 0;
          drawY = (displayHeight - drawHeight) / 2;
        } else {
          drawHeight = displayHeight;
          drawWidth = displayHeight * imgRatio;
          drawX = (displayWidth - drawWidth) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }

      // Draw subtle background visualizer
      backgroundVisualizer.draw(ctx, displayWidth, displayHeight, backgroundType, beatInfo.energy);
    }

    function drawNebula() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw background image
      if (backgroundImageObj && backgroundImageObj.complete) {
        const img = backgroundImageObj;
        const canvasRatio = displayWidth / displayHeight;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawWidth = displayWidth;
          drawHeight = displayWidth / imgRatio;
          drawX = 0;
          drawY = (displayHeight - drawHeight) / 2;
        } else {
          drawHeight = displayHeight;
          drawWidth = displayHeight * imgRatio;
          drawX = (displayWidth - drawWidth) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }

      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const beatPulse = 1 + beatInfo.energy * 0.3;

      // Get colors from props or use defaults
      let nebulaC1 = waveColor;
      let nebulaC2 = '#4cc2e9'; // cyan
      let nebulaC3 = '#ff6b9d'; // pink

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
      const time = performance.now() / 1000;
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
        const starDist = Math.random() * Math.min(displayWidth, displayHeight) * 0.45;
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
    }

    function drawAurora() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw background image
      if (backgroundImageObj && backgroundImageObj.complete) {
        const img = backgroundImageObj;
        const canvasRatio = displayWidth / displayHeight;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawWidth = displayWidth;
          drawHeight = displayWidth / imgRatio;
          drawX = 0;
          drawY = (displayHeight - drawHeight) / 2;
        } else {
          drawHeight = displayHeight;
          drawWidth = displayHeight * imgRatio;
          drawX = (displayWidth - drawWidth) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }

      const time = performance.now() / 1000;
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // ===== Aurora wave bands =====
      const bandCount = 5;
      ctx.globalCompositeOperation = 'screen';

      for (let band = 0; band < bandCount; band++) {
        const bandY = centerY - displayHeight * 0.15 + (band / bandCount) * displayHeight * 0.3;
        const bandAlpha = 0.4 - band * 0.06;
        const phaseOffset = band * Math.PI / 4;
        const freqMultiplier = 1 + band * 0.3;

        ctx.beginPath();
        for (let x = 0; x <= displayWidth; x += 5) {
          const normalizedX = x / displayWidth;
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

      // ===== Soft vertical rays on beat =====
      if (beatInfo.hasBeat) {
        const rayCount = 8;
        for (let i = 0; i < rayCount; i++) {
          const rayX = displayWidth * (0.2 + (i / rayCount) * 0.6);
          const rayHeight = 30 + Math.random() * 50 + beatInfo.energy * 40;
          const gradient = ctx.createLinearGradient(rayX, centerY - rayHeight, rayX, centerY + rayHeight);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.5, `hsla(180, 70%, 70%, 0.15)`);
          gradient.addColorStop(1, 'transparent');

          ctx.fillStyle = gradient;
          ctx.fillRect(rayX - 2, centerY - rayHeight, 4, rayHeight * 2);
        }
      }
    }

    function drawFireflies() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw background image
      if (backgroundImageObj && backgroundImageObj.complete) {
        const img = backgroundImageObj;
        const canvasRatio = displayWidth / displayHeight;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawWidth = displayWidth;
          drawHeight = displayWidth / imgRatio;
          drawX = 0;
          drawY = (displayHeight - drawHeight) / 2;
        } else {
          drawHeight = displayHeight;
          drawWidth = displayHeight * imgRatio;
          drawX = (displayWidth - drawWidth) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }

      const time = performance.now() / 1000;
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;

      // Initialize fireflies if not done
      if (fireflies.current.length === 0 || !fireflies.current[0]?.x) {
        fireflies.current = [];
        for (let i = 0; i < 50; i++) {
          fireflies.current.push({
            x: Math.random() * (displayWidth || 100),
            y: Math.random() * (displayHeight || 100),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.04,
            baseX: Math.random() * (displayWidth || 100),
            baseY: Math.random() * (displayHeight || 100),
          });
        }
      }

      // Update and draw fireflies
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < fireflies.current.length; i++) {
        const f = fireflies.current[i];

        // Skip if invalid values
        if (!isFinite(f.x) || !isFinite(f.y)) {
          f.x = Math.random() * displayWidth;
          f.y = Math.random() * displayHeight;
        }

        // Swarm toward center on beat
        let targetX = f.baseX;
        let targetY = f.baseY;
        if (beatInfo.energy > 0.3 && isFinite(centerX) && isFinite(centerY)) {
          targetX = centerX + (Math.random() - 0.5) * displayWidth * 0.3;
          targetY = centerY + (Math.random() - 0.5) * displayHeight * 0.3;
        }

        // Smooth movement toward target
        f.x += (targetX - f.x) * 0.02;
        f.y += (targetY - f.y) * 0.02;

        // Random wandering
        f.x += Math.sin(time + i) * 0.5;
        f.y += Math.cos(time + i * 0.7) * 0.5;

        // Clamp to valid bounds
        f.x = Math.max(0, Math.min(displayWidth, f.x));
        f.y = Math.max(0, Math.min(displayHeight, f.y));

        // Pulse
        const pulse = Math.sin(time * f.pulseSpeed * 50 + f.phase) * 0.5 + 0.5;
        const size = 2 + pulse * 3 + beatInfo.energy * 2;
        const alpha = 0.4 + pulse * 0.5 + beatInfo.energy * 0.3;

        // Ensure valid size
        const validSize = isFinite(size) ? Math.max(0.1, size) : 2;
        const validX = isFinite(f.x) ? f.x : displayWidth / 2;
        const validY = isFinite(f.y) ? f.y : displayHeight / 2;

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
    }

    function drawPlasma() {
      if (!analyser || !ctx) return;
      analyser.getByteFrequencyData(barDataArray);
      const beatInfo = beatDetector.analyze(barDataArray);

      // Clear and draw background
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Draw background image
      if (backgroundImageObj && backgroundImageObj.complete) {
        const img = backgroundImageObj;
        const canvasRatio = displayWidth / displayHeight;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (canvasRatio > imgRatio) {
          drawWidth = displayWidth;
          drawHeight = displayWidth / imgRatio;
          drawX = 0;
          drawY = (displayHeight - drawHeight) / 2;
        } else {
          drawHeight = displayHeight;
          drawWidth = displayHeight * imgRatio;
          drawX = (displayWidth - drawWidth) / 2;
          drawY = 0;
        }
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      }

      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const time = performance.now() / 1000;
      const baseRadius = Math.min(displayWidth, displayHeight) / 4 * (1 + beatInfo.energy * 0.35);

      ctx.globalCompositeOperation = 'screen';

      // ===== Morphing blob layers =====
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

      // ===== Floating bubbles on beat =====
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
    }

    function draw() {
      if (!ctx) return;

      // Increment time for organic animations
      setTime(prev => prev + 0.016);

      // Update and draw particles
      if (enableParticles) {
        const beatInfo = beatDetector.analyze(barDataArray);
        particleSystem.update(displayWidth, displayHeight, beatInfo);
        particleSystem.draw(ctx);
      }

      if (visualizationType === 'oscilloscope') {
        drawOscilloscope();
      } else if (visualizationType === 'bars') {
        drawBars();
      } else if (visualizationType === 'circle') {
        drawCircle();
      } else if (visualizationType === 'radial') {
        drawRadial();
      } else if (visualizationType === 'organicSphere') {
        drawOrganicSphere();
      } else if (visualizationType === 'nebula') {
        drawNebula();
      } else if (visualizationType === 'aurora') {
        drawAurora();
      } else if (visualizationType === 'fireflies') {
        initFireflies();
        drawFireflies();
      } else if (visualizationType === 'plasma') {
        drawPlasma();
      }

      // Force browser to render the canvas (critical for export capture)
      if (isExporting && ctx) {
        ctx.getImageData(0, 0, 1, 1);
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(draw);
      }
    }

    if (isPlaying) {
      draw();
    }

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [
    analyser,
    isPlaying,
    waveColor,
    backgroundColor,
    backgroundImage,
    waveHeight,
    lineWidth,
    width,
    height,
    visualizationType,
    barCount,
    smoothing,
    useGradient,
    gradientColors,
    enableGlow,
    enableParticles,
    enableTrails,
    backgroundType,
    mirrorMode,
    isExporting,
  ]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          background: backgroundColor,
          borderRadius: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {visualizationType === 'organicSphere' && !isExporting && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <SiriOrb
            size={Math.min(
              canvasRef.current?.parentElement?.clientWidth || 540,
              height || 200
            ) * 0.5}
            energy={orbEnergy}
            colors={useGradient && gradientColors.length >= 3 ? {
              c1: gradientColors[0],
              c2: gradientColors[1] || gradientColors[0],
              c3: gradientColors[2] || gradientColors[0],
            } : undefined}
            animationDuration={20}
          />
        </div>
      )}
    </div>
  );
});

export default React.memo(VisualizerCanvas);
