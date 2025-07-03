import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayIcon, PauseIcon } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onEnded?: () => void;
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  isPlaying,
  onPlayPause,
  currentTime,
  duration,
  onSeek,
  onEnded,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  return (
    <div>
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        style={{ display: 'none' }}
        onEnded={onEnded}
        onTimeUpdate={e => {
          if (audioRef.current) {
            onSeek(audioRef.current.currentTime);
          }
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <Button
          onClick={onPlayPause}
          variant="secondary"
          style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 600 }}
        >
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        </Button>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration}
          step={0.01}
          onValueChange={([v]) => {
            if (audioRef.current) {
              audioRef.current.currentTime = v;
              onSeek(v);
            }
          }}
          className="flex-1"
        />
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioPlayer; 