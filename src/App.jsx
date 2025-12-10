import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, 
  Share, 
  Wand2, 
  Sliders, 
  Image as ImageIcon, 
  Undo2, 
  Aperture,
  Sparkles,
  Zap, 
  Clapperboard, 
  Sun,
  Activity, // 特效圖示
  MoveHorizontal,
  Ghost
} from 'lucide-react';

// 濾鏡定義
const FILTERS = [
  { 
    id: 'none', 
    name: '原圖', 
    icon: <ImageIcon size={18}/>, 
    filter: 'none',
    overlay: null 
  },
  { 
    id: 'film', 
    name: '經典底片', 
    icon: <Aperture size={18}/>, 
    filter: 'contrast(130%) saturate(145%) sepia(25%) brightness(105%) hue-rotate(-5deg)',
    overlay: { color: 'rgba(255, 180, 80, 0.3)', mode: 'soft-light' }
  },
  { 
    id: 'ccd', 
    name: 'CCD相機', 
    icon: <Zap size={18}/>, 
    filter: 'contrast(150%) saturate(140%) brightness(115%) hue-rotate(5deg)',
    overlay: { color: 'rgba(80, 80, 255, 0.35)', mode: 'overlay' }
  },
  { 
    id: 'movie', 
    name: '電影感', 
    icon: <Clapperboard size={18}/>, 
    filter: 'contrast(130%) saturate(90%) sepia(20%) hue-rotate(170deg) brightness(90%)',
    overlay: { color: 'rgba(0, 60, 90, 0.45)', mode: 'overlay' }
  },
  { 
    id: 'soft', 
    name: '奶油柔光', 
    icon: <Sun size={18}/>, 
    filter: 'brightness(120%) contrast(85%) saturate(85%)',
    overlay: { color: 'rgba(255, 255, 255, 0.35)', mode: 'screen' }
  },
  { 
    id: 'bw_vogue', 
    name: '時尚黑白', 
    icon: <Aperture size={18}/>, 
    filter: 'grayscale(100%) contrast(160%) brightness(110%)',
    overlay: { color: 'rgba(20, 20, 20, 0.15)', mode: 'multiply' }
  },
];

// 動態特效定義
const EFFECTS = [
  { id: 'none', name: '無特效', icon: <ImageIcon size={18}/> },
  { id: 'glitch', name: '故障風', icon: <Activity size={18}/> },
  { id: 'speed', name: '速度感', icon: <MoveHorizontal size={18}/> },
  { id: 'dizzy', name: '迷幻暈', icon: <Ghost size={18}/> },
];

export default function App() {
  const [image, setImage] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  
  const [settings, setSettings] = useState({
    smoothness: 0,    
    brightness: 100,  
    contrast: 100,    
    filterId: 'none',
    showTimestamp: false,
    effectId: 'none', // 新增特效狀態
    effectIntensity: 50 // 特效強度 (0-100)
  });

  const [activeTab, setActiveTab] = useState('filters'); 
  const [isComparing, setIsComparing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(''); 

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {}, [image, activeTab]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setOriginalUrl(event.target.result);
          setSettings({
            smoothness: 0,
            brightness: 100,  
            contrast: 100,    
            filterId: 'none', 
            showTimestamp: false,
            effectId: 'none',
            effectIntensity: 50
          });
          setAiAnalysisResult('');
          setActiveTab('filters');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleSave = async () => {
    if (!processedUrl) return;
    if (navigator.share && navigator.canShare) {
      try {
        const file = dataURLtoFile(processedUrl, `vibe-cam-${Date.now()}.jpg`);
        const shareData = {
          files: [file],
          title: 'Vibe Cam Photo',
          text: 'Check out my photo from Vibe Cam!'
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        console.log('Share failed', err);
      }
    }
    const link = document.createElement('a');
    link.download = `vibe-cam-${Date.now()}.jpg`;
    link.href = processedUrl;
    link.click();
  };

  // 1. 雜訊函數
  const addGrain = (ctx, width, height, type) => {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = width / 2; 
    grainCanvas.height = height / 2;
    const grainCtx = grainCanvas.getContext('2d');
    
    const imgData = grainCtx.createImageData(grainCanvas.width, grainCanvas.height);
    const buffer32 = new Uint32Array(imgData.data.buffer);
    const len = buffer32.length;

    const isCCD = type === 'ccd';
    const intensity = isCCD ? 60 : 30; 

    for (let i = 0; i < len; i++) {
        if (Math.random() < 0.85) {
             const value = Math.random() * intensity; 
             const alpha = (Math.random() * 25 + 10) | 0; 
             let r = value, g = value, b = value;
             if (isCCD && Math.random() > 0.6) {
                if (Math.random() > 0.5) r += 30; else b += 40;
             }
             buffer32[i] = (alpha << 24) | (b << 16) | (g << 8) | r;
        }
    }
    
    grainCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = isCCD ? 0.35 : 0.45; 
    ctx.drawImage(grainCanvas, 0, 0, width, height);
    ctx.restore();
  };

  // 2. 特效函數：故障風 (RGB Shift)
  const applyGlitch = (ctx, width, height, intensity) => {
    const offset = (width * 0.01) * (intensity / 50); // 位移量
    
    // 複製當前畫面
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // 濾色混合
    
    // 紅色通道位移
    ctx.fillStyle = 'red'; // 這只是為了標記，實際是用 multiply 或其他方式分離通道比較複雜
    // 簡單模擬：畫兩次，一次偏紅，一次偏藍
    
    // 為了效能，我們用簡單的透明度疊加位移
    // Red Channel Shift
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(tempCanvas, offset, 0); // 右移
    
    // Blue/Green Channel Shift
    ctx.drawImage(tempCanvas, -offset, 0); // 左移
    
    // 增加一點掃描線
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for(let y=0; y<height; y+=4) {
        ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  };

  // 3. 特效函數：速度感 (Motion Blur 模擬)
  const applySpeed = (ctx, width, height, intensity) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.1; // 低透明度
    const passes = 5 + Math.floor(intensity / 10);
    const step = (width * 0.02) * (intensity / 100);

    // 向兩側殘影
    for (let i = 1; i <= passes; i++) {
        ctx.drawImage(tempCanvas, i * step, 0);
        ctx.drawImage(tempCanvas, -i * step, 0);
    }
    ctx.restore();
  };

  // 4. 特效函數：迷幻暈 (Zoom Blur 模擬)
  const applyDizzy = (ctx, width, height, intensity) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d').drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // 讓光暈更明顯
    ctx.globalAlpha = 0.1;
    const passes = 5;
    const scaleStep = 0.01 * (intensity / 50);

    for (let i = 1; i <= passes; i++) {
        const scale = 1 + (i * scaleStep);
        const w = width * scale;
        const h = height * scale;
        const x = (width - w) / 2;
        const y = (height - h) / 2;
        ctx.drawImage(tempCanvas, x, y, w, h);
    }
    ctx.restore();
  };

  const addTimestamp = (ctx, width, height) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const isCCD = settings.filterId === 'ccd';
    const dateStr = isCCD ? `${year}/${month}/${day}` : `'${year.toString().slice(-2)} ${month} ${day}`;
    
    const fontSize = Math.max(24, width * 0.04);
    const paddingX = width * 0.06;
    const paddingY = height * 0.05;

    ctx.save();
    ctx.font = `bold ${fontSize}px ${isCCD ? '"Verdana", sans-serif' : '"Courier New", monospace'}`;
    ctx.fillStyle = isCCD ? '#aaffff' : '#ff9500'; 
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(dateStr, width - ctx.measureText(dateStr).width - paddingX, height - paddingY);
    ctx.restore();
  };

  const runAiOptimization = () => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const sampleData = ctx.getImageData(width/2 - 50, height/2 - 50, 100, 100).data;
    let totalBrightness = 0;
    
    for (let i = 0; i < sampleData.length; i += 4) {
      totalBrightness += (sampleData[i] + sampleData[i+1] + sampleData[i+2]) / 3;
    }
    
    const avgBrightness = totalBrightness / (sampleData.length / 4);

    let newBrightness = 100;
    let newContrast = 100;
    let resultText = "";

    if (avgBrightness < 70) {
      newBrightness = 130; 
      resultText = "低光補償 +30%";
    } else if (avgBrightness > 210) {
      newBrightness = 85;  
      resultText = "高光抑制 -15%";
    } else {
      newBrightness = 105; 
      resultText = "智能校色完成";
    }

    if (settings.filterId === 'ccd') {
      newContrast = 125;
    } else if (settings.filterId === 'soft') {
      newContrast = 95;
      newBrightness += 5;
    } else {
      newContrast = 110;
    }

    setSettings(prev => ({
      ...prev,
      brightness: newBrightness,
      contrast: newContrast
    }));
    
    setAiAnalysisResult(resultText);
    setTimeout(() => setAiAnalysisResult(''), 3000);
  };

  const processImage = useCallback(() => {
    if (!image || !canvasRef.current) return;
    setIsProcessing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const MAX_WIDTH = 2400; 
    let width = image.width;
    let height = image.height;

    if (width > MAX_WIDTH) {
      height = Math.floor((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const currentFilter = FILTERS.find(f => f.id === settings.filterId);
    
    // 柔光效果
    if (settings.filterId === 'soft' || settings.smoothness > 0) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.floor(width / 4); 
        offCanvas.height = Math.floor(height / 4);
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(image, 0, 0, offCanvas.width, offCanvas.height);
        
        const blurAmount = settings.filterId === 'soft' ? '15px' : '5px';
        const brightAmount = settings.filterId === 'soft' ? '130%' : '110%';
        offCtx.filter = `blur(${blurAmount}) brightness(${brightAmount})`; 
        offCtx.drawImage(offCanvas, 0, 0); 

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        ctx.globalAlpha = settings.filterId === 'soft' ? 0.6 : 0.3;
        ctx.drawImage(offCanvas, 0, 0, width, height);
        ctx.restore();
    }

    // 應用濾鏡
    const filterString = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) ${currentFilter.filter !== 'none' ? currentFilter.filter : ''}`;
    
    // 在應用濾鏡前，先 snapshot
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.filter = filterString;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // 應用疊色
    if (currentFilter.overlay) {
      ctx.save();
      ctx.globalCompositeOperation = currentFilter.overlay.mode;
      ctx.fillStyle = currentFilter.overlay.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 應用動態特效 (新增)
    if (settings.effectId === 'glitch') {
        applyGlitch(ctx, width, height, settings.effectIntensity);
    } else if (settings.effectId === 'speed') {
        applySpeed(ctx, width, height, settings.effectIntensity);
    } else if (settings.effectId === 'dizzy') {
        applyDizzy(ctx, width, height, settings.effectIntensity);
    }

    // 應用雜訊
    if (['film', 'ccd', 'bw_vogue'].includes(settings.filterId)) {
      addGrain(ctx, width, height, settings.filterId);
    }

    // 時間戳記
    if (settings.showTimestamp) {
      addTimestamp(ctx, width, height);
    }

    setProcessedUrl(canvas.toDataURL('image/jpeg', 0.95));
    setIsProcessing(false);

  }, [image, settings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      processImage();
    }, 40); 
    return () => clearTimeout(timer);
  }, [processImage]);

  const triggerFileInput = () => fileInputRef.current.click();

  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 font-sans selection:bg-orange-500 selection:text-white">
        <div className="w-full max-w-md space-y-10 text-center relative z-10">
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter italic bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
              VIBE CAM
            </h1>
            <p className="text-neutral-500 text-xs font-mono tracking-[0.2em] uppercase">Next Gen Film Emulation</p>
          </div>
          
          <div 
            onClick={triggerFileInput}
            className="group relative w-64 h-64 mx-auto rounded-full border border-neutral-800 bg-neutral-900/30 cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 border-[1px] border-neutral-800 rounded-full scale-[0.8]" />
            <div className="absolute inset-0 border-[1px] border-neutral-800 rounded-full scale-[0.6]" />
            <div className="relative z-10 flex flex-col items-center gap-3 group-hover:text-orange-500 transition-colors text-neutral-400">
               <ImageIcon size={48} strokeWidth={1} />
               <span className="text-xs font-bold tracking-widest">TAP TO START</span>
            </div>
            <div className="absolute inset-0 bg-orange-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black -z-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none font-sans">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/80 backdrop-blur-md z-20 border-b border-white/5">
        <button onClick={() => setImage(null)} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
          <Undo2 size={20} />
        </button>
        <div className="flex items-center gap-2">
            <span className="font-black italic text-lg tracking-tighter bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                VIBE
            </span>
        </div>
        <button 
          onClick={handleSave}
          className="bg-white text-black px-5 py-1.5 rounded-full text-xs font-bold tracking-wide hover:bg-neutral-200 transition-colors flex items-center gap-2"
        >
          {navigator.share ? <Share size={14} /> : <Download size={14} />}
          {navigator.share ? 'SHARE' : 'SAVE'}
        </button>
      </div>

      {/* Main Preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-900/50 p-4">
        {processedUrl ? (
          <div 
            className="relative shadow-2xl shadow-black rounded-sm max-w-full max-h-full flex items-center justify-center"
            onPointerDown={() => setIsComparing(true)}
            onPointerUp={() => setIsComparing(false)}
            onPointerLeave={() => setIsComparing(false)}
          >
             <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-20">
                {aiAnalysisResult ? (
                   <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium text-orange-400 border border-orange-500/20 animate-in fade-in slide-in-from-top-4">
                     ✨ {aiAnalysisResult}
                   </div>
                ) : (
                  <div className={`bg-black/40 backdrop-blur px-3 py-1 rounded-full text-[10px] font-medium tracking-wider border border-white/5 transition-opacity ${isComparing ? 'opacity-100' : 'opacity-0'}`}>
                    ORIGINAL
                  </div>
                )}
             </div>

            <img 
              src={isComparing ? originalUrl : processedUrl} 
              alt="Preview" 
              className="max-h-[calc(100vh-220px)] max-w-full object-contain"
              style={{ filter: isComparing ? 'none' : 'none' }} 
              onDragStart={(e) => e.preventDefault()}
            />
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="animate-pulse bg-neutral-800 w-full h-full" />
        )}
      </div>

      {/* Controls */}
      <div className="bg-black border-t border-white/5 pb-safe z-30">
        
        {/* Adjust Tab */}
        {activeTab === 'adjust' && (
          <div className="px-6 py-6 space-y-6 animate-in slide-in-from-bottom-2">
            {/* 時間戳記開關 */}
            <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Global Params</span>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">DATE STAMP</span>
                  <button 
                    onClick={() => setSettings(s => ({...s, showTimestamp: !s.showTimestamp}))}
                    className={`w-8 h-4 rounded-full transition-colors relative ${settings.showTimestamp ? 'bg-orange-500' : 'bg-neutral-800'}`}
                  >
                    <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-transform ${settings.showTimestamp ? 'left-5' : 'left-1'}`} />
                  </button>
               </div>
            </div>

            {[
              { key: 'brightness', label: 'Exposure', min: 50, max: 150 },
              { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
            ].map(item => (
                 <div key={item.key} className="space-y-3">
                   <div className="flex justify-between text-xs text-neutral-300 font-medium">
                     <span>{item.label}</span>
                     <span className="font-mono text-neutral-500">{settings[item.key] - 100}</span>
                   </div>
                   <input 
                    type="range" min={item.min} max={item.max} 
                    value={settings[item.key]}
                    onChange={(e) => setSettings({...settings, [item.key]: parseInt(e.target.value)})}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-orange-400 transition-colors"
                  />
                 </div>
            ))}
          </div>
        )}

        {/* Effects Tab (NEW) */}
        {activeTab === 'effects' && (
          <div className="px-6 py-6 space-y-6 animate-in slide-in-from-bottom-2">
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Action FX</span>
               {settings.effectId !== 'none' && (
                 <span className="text-[10px] text-orange-400 font-mono">INTENSITY: {settings.effectIntensity}%</span>
               )}
             </div>

             {/* 特效選擇按鈕 */}
             <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2">
                {EFFECTS.map(effect => (
                  <button
                    key={effect.id}
                    onClick={() => setSettings({...settings, effectId: effect.id})}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${settings.effectId === effect.id ? 'bg-neutral-800 border-orange-500 text-orange-500' : 'bg-neutral-900 border-transparent text-neutral-400'}`}
                  >
                    {effect.icon}
                    <span className="text-[10px] font-bold">{effect.name}</span>
                  </button>
                ))}
             </div>

             {/* 特效強度拉桿 */}
             {settings.effectId !== 'none' && (
               <div className="space-y-2 animate-in fade-in">
                 <input 
                    type="range" min="0" max="100" 
                    value={settings.effectIntensity}
                    onChange={(e) => setSettings({...settings, effectIntensity: parseInt(e.target.value)})}
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
               </div>
             )}
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="flex flex-col gap-4 py-4 animate-in slide-in-from-bottom-2">
            
            <div className="px-4 flex justify-end">
                <button 
                  onClick={runAiOptimization}
                  className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 hover:bg-neutral-800 text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 text-neutral-300 hover:text-white group"
                >
                  <Sparkles size={14} className="text-orange-500 group-hover:rotate-12 transition-transform" />
                  AI 場景優化
                </button>
            </div>

            <div className="flex overflow-x-auto px-4 gap-3 no-scrollbar pb-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSettings({...settings, filterId: f.id})}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group relative"
                >
                  <div className={`w-16 h-20 rounded-xl overflow-hidden border transition-all relative ${settings.filterId === f.id ? 'border-white scale-100 opacity-100' : 'border-transparent opacity-50 scale-95'}`}>
                     <img src={originalUrl} className="w-full h-full object-cover" style={{ filter: f.filter }} alt={f.name} />
                     <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {f.icon}
                     </div>
                     {f.overlay && (
                       <div 
                        className="absolute inset-0 pointer-events-none" 
                        style={{ backgroundColor: f.overlay.color, mixBlendMode: f.overlay.mode }} 
                       />
                     )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${settings.filterId === f.id ? 'text-white' : 'text-neutral-600'}`}>
                    {f.name}
                  </span>
                  {settings.filterId === f.id && (
                    <div className="w-1 h-1 bg-orange-500 rounded-full absolute -bottom-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex justify-center gap-12 items-center pt-2 pb-6 border-t border-white/5 bg-black">
          <button onClick={() => setActiveTab('filters')} className={`flex flex-col items-center gap-1.5 transition-colors p-2 ${activeTab === 'filters' ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
            <Aperture size={24} />
            <span className="text-[9px] font-bold tracking-widest uppercase">Filters</span>
          </button>

          {/* 新增特效分頁 */}
          <button onClick={() => setActiveTab('effects')} className={`flex flex-col items-center gap-1.5 transition-colors p-2 ${activeTab === 'effects' ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
            <Activity size={24} />
            <span className="text-[9px] font-bold tracking-widest uppercase">FX</span>
          </button>

          <button onClick={() => setActiveTab('adjust')} className={`flex flex-col items-center gap-1.5 transition-colors p-2 ${activeTab === 'adjust' ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
            <Sliders size={24} />
            <span className="text-[9px] font-bold tracking-widest uppercase">Adjust</span>
          </button>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
      `}</style>
    </div>
  );
}