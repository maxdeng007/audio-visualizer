import * as React from "react";

const thumbImg = "/close-filled.svg"; // Replace with the correct SVG if needed

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelPosition?: 'left' | 'right';
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onChange, disabled, label, labelPosition = 'right', ...props }, ref) => {
    return (
      <label
        className={`inline-flex items-center cursor-pointer select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className || ''}`}
      >
        {label && labelPosition === 'left' && (
          <span className="text-[14px] font-normal text-[#0F172A] mr-2">{label}</span>
        )}
        <span className="relative inline-block w-10 h-6">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            ref={ref}
            {...props}
          />
          <span
            className={`absolute left-0 top-0 w-10 h-6 rounded-full transition
              ${checked ? 'bg-[#ffd041] border border-[#2a0f23]' : 'bg-slate-200 border border-slate-900'}
            `}
            style={{ borderRadius: 100 }}
          />
          <span
            className={`absolute top-1 left-1 w-4 h-4 transition-transform duration-200
              ${checked ? 'translate-x-4' : ''}
            `}
            style={{ zIndex: 2, background: '#111', borderRadius: '50%' }}
          />
        </span>
        {label && labelPosition === 'right' && (
          <span className="text-[14px] font-normal text-[#0F172A] ml-2">{label}</span>
        )}
      </label>
    );
  }
);
Switch.displayName = "Switch"; 