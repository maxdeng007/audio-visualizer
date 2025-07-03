import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayIcon, PauseIcon } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  onAnalyserReady: (analyser: AnalyserNode | null) => void;
  onDuration: (duration: number) => void;
  onCurrentTime: (time: number) => void;
  onIsPlaying: (playing: boolean) => void;
  isExporting?: boolean;
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const imgTdesignPlayRectangleFilled = "http://localhost:3845/assets/3cebc3ee481620246836201a423ab1771a9575ea.svg";
const imgIndicator = "http://localhost:3845/assets/d25e80af11d2ba9fa3b8f1a8b34d76b1d757f124.svg";
const imgVector = "http://localhost:3845/assets/22f73208f9709c55eb51841ad8c595fc2beafc12.svg";
const imgVector1 = "http://localhost:3845/assets/23bca538a0ea9a642ad90b630a21424da6e1b583.svg";

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onAnalyserReady,
  onDuration,
  onCurrentTime,
  onIsPlaying,
  isExporting = false,
}) => {
  const [audioElementKey, setAudioElementKey] = useState(() => Math.random());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [, setRafTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);

  useEffect(() => {
    setAudioElementKey(Math.random()); // force new <audio> element on url change
  }, [audioUrl]);

  useLayoutEffect(() => {
    if (!audioUrl || !audioElementRef.current) return;
    // Clean up any previous context/source
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    setAnalyser(null);
    setError(null);
    let ctx: AudioContext | null = null;
    let src: MediaElementAudioSourceNode | null = null;
    let analyserNode: AnalyserNode | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      src = ctx.createMediaElementSource(audioElementRef.current);
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      src.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      setAudioContext(ctx);
      setAnalyser(analyserNode);
      sourceNodeRef.current = src;
      onAnalyserReady(analyserNode);
      // Set duration when metadata is loaded
      audioElementRef.current.onloadedmetadata = () => {
        setDuration(audioElementRef.current?.duration || 0);
        onDuration(audioElementRef.current?.duration || 0);
      };
    } catch (err: any) {
      setError('Audio setup error: ' + (err?.message || err));
      console.error('Audio setup error:', err);
      onAnalyserReady(null);
    }
    return () => {
      if (ctx) ctx.close();
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {}
        sourceNodeRef.current = null;
      }
      onAnalyserReady(null);
      audioElementRef.current = null;
    };
    // eslint-disable-next-line
  }, [audioElementKey]);

  // Sync current time
  useEffect(() => {
    if (!audioElementRef.current) return;
    let rafId: number | null = null;
    const update = () => {
      if (audioElementRef.current && isPlaying && !audioElementRef.current.paused) {
        setCurrentTime(audioElementRef.current.currentTime);
        onCurrentTime(audioElementRef.current.currentTime);
        rafId = requestAnimationFrame(update);
      }
    };
    if (isPlaying) {
      rafId = requestAnimationFrame(update);
    } else {
      // On pause, immediately sync currentTime
      if (audioElementRef.current) {
        setCurrentTime(audioElementRef.current.currentTime);
        onCurrentTime(audioElementRef.current.currentTime);
      }
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line
  }, [isPlaying, audioUrl]);

  // Sync isPlaying state
  useEffect(() => {
    onIsPlaying(isPlaying);
    // eslint-disable-next-line
  }, [isPlaying]);

  // Animation frame loop to force re-render while playing
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const tick = () => {
      setRafTick(t => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
  };

  // In render, use dragTime if dragging, otherwise live current time
  const liveCurrentTime = isDragging && dragTime !== null
    ? dragTime
    : (isPlaying && audioElementRef.current
      ? audioElementRef.current.currentTime
      : currentTime);

  return (
    <>
      <audio
        key={audioElementKey}
        ref={audioElementRef}
        src={audioUrl || undefined}
        style={{ display: 'none' }}
        onEnded={() => setIsPlaying(false)}
      />
      {error && (
        <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', padding: '0 8px', background: '#fff' }}>
        {/* Play Button */}
        <button
          onClick={handlePlayPause}
          disabled={isExporting || !!error}
          style={{ width: 40, height: 40, background: 'none', border: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isExporting || !!error ? 'not-allowed' : 'pointer' }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <div style={{ position: 'relative', width: 40, height: 40 }}>
            <div style={{ position: 'absolute', bottom: '12.5%', left: '4.167%', right: '4.167%', top: '12.5%' }}>
              <img
                src={isPlaying ? '/button_pause.svg' : '/button_play.svg'}
                alt={isPlaying ? 'Pause' : 'Play'}
                style={{ display: 'block', width: '100%', height: '100%', maxWidth: 'none' }}
              />
            </div>
          </div>
        </button>
        {/* Progress Bar using shadcn/ui Slider */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Slider
            value={[liveCurrentTime]}
            min={0}
            max={duration}
            step={0.01}
            onValueChange={([v]) => {
              if (audioElementRef.current) {
                audioElementRef.current.currentTime = v;
                setCurrentTime(v);
                onCurrentTime(v);
              }
            }}
            className="flex-1"
            disabled={!!error || isExporting}
          />
        </div>
        {/* Time */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontFamily: 'Noto Sans, sans-serif', fontWeight: 400, fontSize: 12, color: '#000', gap: 2 }}>
          <span style={{ whiteSpace: 'nowrap' }}>{formatTime(currentTime)}</span>
          <span style={{ margin: '0 2px' }}>/</span>
          <span style={{ whiteSpace: 'nowrap' }}>{formatTime(duration)}</span>
        </div>
      </div>
    </>
  );
};

export default AudioPlayer; 