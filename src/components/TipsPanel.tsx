import React from 'react';

const TipsPanel: React.FC = () => (
  <div className="bg-white rounded my-4 p-4 text-xs text-slate-900 border border-slate-200 shadow"
       style={{ backgroundImage: "url('/tile_tips.png')", backgroundRepeat: 'repeat' }}>
    <div className="font-bold mb-1">Tips:</div>
    <div>
      To convert to MP4, run:<br />
      <code className="bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">
        ffmpeg -i yourfile.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4
      </code>
    </div>
  </div>
);

export default TipsPanel; 