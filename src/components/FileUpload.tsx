import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onFileSelected(file);
      e.target.value = "";
    } else if (file) {
      alert('Please select a valid audio file.');
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onFileSelected(file);
    } else if (file) {
      alert('Please select a valid audio file.');
    }
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className={`border-2 border-dashed border-slate-400 rounded p-6 text-center cursor-pointer bg-white mb-4 transition ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}`}
    >
      <label htmlFor="audio-file-upload" className="hidden">Upload Audio File</label>
      <input
        id="audio-file-upload"
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        aria-label="Upload Audio File"
      />
      <span className="text-slate-400">Drag & drop or click to upload audio file</span>
    </div>
  );
};

export default FileUpload; 