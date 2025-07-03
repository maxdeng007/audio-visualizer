import React from 'react';
import { Progress } from './ui/progress';

interface ExportPanelProps {
  onExport: () => void;
  onDownload: () => void;
  onCancel: () => void;
  exporting: boolean;
  downloading: boolean;
  audioFile?: File | null;
  exportUrl?: string | null;
  exportProgress?: number;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  onExport,
  onDownload,
  onCancel,
  exporting,
  downloading,
  audioFile,
  exportUrl,
  exportProgress,
}) => (
  <div className="flex flex-col gap-4 my-6">
    {audioFile && !exporting && (
      <button
        onClick={onExport}
        disabled={exporting}
        className={`w-full py-4 bg-white border-2 border-black rounded font-bold text-lg shadow-[-2px_2px_0px_0px_#000] transition ${exporting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        Export
      </button>
    )}
    {audioFile && exporting && (
      <div className="w-full flex flex-row items-center justify-center p-4 bg-white">
        <span className="font-normal text-[16px] text-slate-900 mr-4" style={{fontFamily: 'Noto Sans, sans-serif'}}>Exporting</span>
        <div className="flex-1 flex flex-row items-center gap-2">
          <div className="relative w-full min-w-[80px] mr-2">
            <Progress value={exportProgress || 0} />
          </div>
          <span className="font-bold text-[16px] text-slate-900 min-w-[40px] text-right" style={{fontFamily: 'Noto Sans, sans-serif'}}>{Math.round(exportProgress || 0)}%</span>
        </div>
        <button
          onClick={onCancel}
          className="ml-4 font-normal text-[16px] text-[#ff0000] bg-transparent border-none p-0 cursor-pointer hover:underline"
          style={{fontFamily: 'Noto Sans, sans-serif'}}
        >
          cancel
        </button>
      </div>
    )}
    {exportUrl && (
      <button
        onClick={onDownload}
        disabled={downloading}
        className={`w-full py-4 bg-white border-2 border-black rounded font-bold text-lg shadow-[-2px_2px_0px_0px_#000] transition ${downloading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        Download
      </button>
    )}
  </div>
);

export default ExportPanel; 