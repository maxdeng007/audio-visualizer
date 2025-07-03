import React from 'react';

export type VisualizerType = 'oscilloscope' | 'bars' | 'circle' | 'radial';

interface VisualizerTypeSelectorProps {
  value: VisualizerType;
  onChange: (type: VisualizerType) => void;
  disabled?: boolean;
}

const types: { label: string; value: VisualizerType }[] = [
  { label: 'Oscilloscope', value: 'oscilloscope' },
  { label: 'Bars', value: 'bars' },
  { label: 'Circle', value: 'circle' },
  { label: 'Radial', value: 'radial' },
];

const VisualizerTypeSelector: React.FC<VisualizerTypeSelectorProps> = ({ value, onChange, disabled }) => (
  <div className="[flex-flow:wrap] box-border content-center flex gap-2 items-center justify-start p-0 relative w-full">
    {types.map(type => (
      <button
        key={type.value}
        onClick={() => onChange(type.value)}
        disabled={disabled}
        className={`box-border content-stretch flex flex-row items-center justify-center gap-[10px] px-4 py-2 rounded relative text-[12px] text-slate-900 whitespace-nowrap font-['Noto_Sans',_sans-serif] leading-none
          ${value === type.value
            ? 'bg-white border border-black font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            : 'bg-transparent border-0 font-normal'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        style={{
          minHeight: 0,
          minWidth: 0,
          borderWidth: value === type.value ? 2 : 1,
          borderStyle: 'solid',
          borderColor: value === type.value ? '#000' : 'transparent',
          fontSize: 16,
        }}
      >
        {type.label}
      </button>
    ))}
  </div>
);

export default VisualizerTypeSelector; 