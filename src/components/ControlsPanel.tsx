import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ControlsPanelProps {
  waveColor: string;
  setWaveColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  waveHeight: number;
  setWaveHeight: (v: number) => void;
  lineWidth: number;
  setLineWidth: (v: number) => void;
  fps: number;
  setFps: (v: number) => void;
  onExport: () => void;
  isExporting: boolean;
  exportProgress: number;
  isConverting: boolean;
  convertProgress: number;
  disabled?: boolean;
  barCount: number;
  setBarCount: (v: number) => void;
  smoothing: number;
  setSmoothing: (v: number) => void;
  useGradient: boolean;
  setUseGradient: (v: boolean) => void;
  gradientColors: string[];
  setGradientColors: (colors: string[]) => void;
  visualizationType: 'oscilloscope' | 'bars' | 'circle' | 'radial';
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  waveColor, setWaveColor,
  backgroundColor, setBackgroundColor,
  waveHeight, setWaveHeight,
  lineWidth, setLineWidth,
  fps, setFps,
  onExport,
  isExporting, exportProgress,
  isConverting, convertProgress,
  disabled,
  barCount, setBarCount,
  smoothing, setSmoothing,
  useGradient, setUseGradient,
  gradientColors, setGradientColors,
  visualizationType
}) => {
  const imgCarbonCloseFilled = "/close-filled.svg";
  const imgMaterialSymbolsLightAddBoxOutline = "http://localhost:3845/assets/02403af245ae3cb915121423eaf90054c4ea1a5e.svg";

  // Helper for adding/removing gradient stops
  const handleGradientColorChange = (idx: number, color: string) => {
    const newColors = [...gradientColors];
    newColors[idx] = color;
    setGradientColors(newColors);
  };
  const handleAddColor = () => {
    setGradientColors([...gradientColors, '#0000ff']);
  };
  const handleRemoveColor = (idx: number) => {
    if (gradientColors.length > 2) {
      setGradientColors(gradientColors.filter((_, i) => i !== idx));
    }
  };
  const showGradientSwitch = visualizationType === 'circle' || visualizationType === 'radial';
  return (
    <div style={{ background: '#fff', border: '1.5px solid #000', borderRadius: 6, padding: 24, width: '100%' }}>
      <div
        className="controls"
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 24,
          marginBottom: 24,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          width: '100%',
        }}
      >
        {/* Responsive columns: stack on mobile */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minWidth: 140,
            width: '100%',
            maxWidth: '100%',
          }}
          className="controls-col controls-col-1"
        >
          {/* Figma-style Wave Color Row */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0, minWidth: 0, maxWidth: '100%' }}>
            <span style={{ fontFamily: 'Noto Sans, sans-serif', fontWeight: 500, fontSize: 14, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 60, flex: 1, marginRight: 4, maxWidth: '100%', marginBottom: 4 }}>Wave</span>
            {showGradientSwitch && (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontFamily: 'Noto Sans, sans-serif', fontWeight: 400, fontSize: 12, color: '#000', whiteSpace: 'nowrap' }}>Grad</span>
                <div style={{ flexShrink: 0, minWidth: 0, maxWidth: '100%', display: 'flex', alignItems: 'center', width: 36 }}>
                  <Switch
                    checked={useGradient}
                    onChange={e => setUseGradient(e.target.checked)}
                    disabled={disabled}
                    label={undefined}
                    style={{ width: 36 }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Color pickers */}
          {!useGradient && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '6px', background: waveColor, cursor: 'pointer', position: 'relative', boxSizing: 'border-box', border: '2px solid #000' }}>
                <input
                  id="waveColor"
                  type="color"
                  value={waveColor}
                  onChange={e => setWaveColor(e.target.value)}
                  title="Wave Color"
                  style={{ opacity: 0, width: 36, height: 36, position: 'absolute', left: 0, top: 0, cursor: 'pointer', borderRadius: '6px' }}
                  aria-label="Wave Color"
                  disabled={disabled}
                />
              </label>
            </div>
          )}
          {useGradient && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
              {gradientColors.map((color, idx) => (
                <div key={idx} style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <label style={{ width: 36, height: 36, borderRadius: '6px', background: color, cursor: 'pointer', border: '2px solid #000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="color"
                      value={color}
                      onChange={e => handleGradientColorChange(idx, e.target.value)}
                      style={{ opacity: 0, width: 36, height: 36, position: 'absolute', left: 0, top: 0, cursor: 'pointer', borderRadius: '6px' }}
                      aria-label={`Gradient color ${idx + 1}`}
                      disabled={disabled}
                    />
                  </label>
                  {gradientColors.length > 2 && (
                    <img
                      src={imgCarbonCloseFilled}
                      alt="Remove color"
                      style={{ position: 'absolute', top: -8, right: -8, width: 16, height: 16, cursor: 'pointer', zIndex: 2 }}
                      onClick={() => handleRemoveColor(idx)}
                      tabIndex={0}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleRemoveColor(idx)}
                      aria-label="Remove color"
                    />
                  )}
                </div>
              ))}
              <div
                style={{ width: 36, height: 36, borderRadius: '6px', background: '#fff', border: '2px solid #000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                onClick={handleAddColor}
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleAddColor()}
                aria-label="Add color"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="4" width="2" height="12" rx="1" fill="#000"/>
                  <rect x="4" y="9" width="12" height="2" rx="1" fill="#000"/>
                </svg>
              </div>
            </div>
          )}
          {/* Background Color */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>Background Color</span>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '6px', background: backgroundColor, cursor: 'pointer', position: 'relative', boxSizing: 'border-box', border: '2px solid #000' }}>
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor}
                onChange={e => setBackgroundColor(e.target.value)}
                title="Background Color"
                style={{ opacity: 0, width: 36, height: 36, position: 'absolute', left: 0, top: 0, cursor: 'pointer', borderRadius: '6px' }}
                aria-label="Background Color"
                disabled={disabled}
              />
            </label>
          </div>
          {/* FPS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>FPS</span>
            <Input id="fps" type="number" min="1" max="60" value={fps} onChange={e => setFps(Number(e.target.value))} title="Frames Per Second" style={{ width: '100%' }} />
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minWidth: 180,
            width: '100%',
            maxWidth: '100%',
          }}
          className="controls-col controls-col-2"
        >
          {/* Wave Height */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>Wave Height</span>
            <Slider value={[waveHeight]} onValueChange={([v]) => setWaveHeight(v)} min={10} max={300} step={1} style={{ width: '100%' }} />
          </div>
          {/* Line Width */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>Line Width</span>
            <Slider value={[lineWidth]} onValueChange={([v]) => setLineWidth(v)} min={1} max={10} step={1} style={{ width: '100%' }} />
          </div>
          {/* Bar Count */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>Bar Count</span>
            <Slider value={[barCount]} onValueChange={([v]) => setBarCount(v)} min={8} max={128} step={1} style={{ width: '100%' }} />
          </div>
          {/* Smoothing */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginTop: 6 }}>
            <span style={{ minHeight: 24, textAlign: 'left', fontSize: 14, fontWeight: 500, color: '#94A3B8', marginBottom: 4, fontFamily: 'Noto Sans, sans-serif' }}>Smoothing</span>
            <Slider value={[smoothing]} onValueChange={([v]) => setSmoothing(v)} min={0} max={0.99} step={0.01} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .controls {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .controls-col {
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ControlsPanel; 