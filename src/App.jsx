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
  Stars,      
  Flame,      
  CircleDot,
  Smartphone,
  Cpu,
  Eraser,
  Trash2,
  Check
} from 'lucide-react';

// --- Vibe Logo Component ---
const VibeLogo = ({ className = "" }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vibe-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F97316" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    <path d="M126 126 Q256 536 386 126 L436 176 Q256 636 76 176 Z" fill="url(#vibe-logo-gradient)" />
    <path d="M126 206 L6 76 L56 176 Z" fill="url(#vibe-logo-gradient)" opacity="0.8" />
    <path d="M386 206 L506 76 L456 176 Z" fill="url(#vibe-logo-gradient)" opacity="0.8" />
  </svg>
);

// 濾鏡定義
const FILTERS = [
  { 
    id: 'none', 
    name: '原圖', 
    icon: <ImageIcon size={18}/>, 
    type: 'normal',
    overlay: null 
  },
  { 
    id: 'film', 
    name: '經典底片', 
    icon: <Aperture size={18}/>, 
    type: 'warm',
    overlay: { color: 'rgba(255, 140, 0, 0.4)', mode: 'soft-light' },
    contrast: 1.2
  },
  { 
    id: 'ccd', 
    name: 'CCD冷調', 
    icon: <Zap size={18}/>, 
    type: 'cool',
    overlay: { color: 'rgba(60, 60, 255, 0.3)', mode: 'overlay' },
    contrast: 1.3
  },
  { 
    id: 'movie', 
    name: '電影感', 
    icon: <Clapperboard size={18}/>, 
    type: 'cinematic',
    overlay: { color: 'rgba(0, 100, 120, 0.5)', mode: 'overlay' },
    contrast: 1.1
  },
  { 
    id: 'soft', 
    name: '奶油柔光', 
    icon: <Sun size={18}/>, 
    type: 'soft',
    overlay: { color: 'rgba(255, 220, 220, 0.4)', mode: 'screen' },
    contrast: 0.9
  },
  { 
    id: 'bw_vogue', 
    name: '時尚黑白', 
    icon: <Aperture size={18}/>, 
    type: 'bw', 
    overlay: { color: 'rgba(0,0,0,1)', mode: 'saturation' }, 
    contrast: 1.5
  },
];

const EFFECTS = [
  { id: 'none', name: '無特效', icon: <ImageIcon size={18}/> },
  { id: 'kira', name: '閃亮亮', icon: <Stars size={18}/> }, 
  { id: 'leak', name: '復古漏光', icon: <Flame size={18}/> }, 
  { id: 'vignette', name: '電影暗角', icon: <CircleDot size={18}/> }, 
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
    effectId: 'none',
    effectIntensity: 70 
  });

  const [activeTab, setActiveTab] = useState('filters'); 
  const [isComparing, setIsComparing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(''); 
  
  // 移除功能相關狀態
  const [removeMaskPoints, setRemoveMaskPoints] = useState([]); // 存儲塗抹路徑
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [brushSize, setBrushSize] = useState(20);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const maskCanvasRef = useRef(null); // 用於顯示紅色塗抹遮罩
  const imgRef = useRef(null); // 用於獲取圖片顯示尺寸

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
            effectIntensity: 70
          });
          setRemoveMaskPoints([]);
          setActiveTab('filters');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!processedUrl) return;
    
    const fetchRes = await fetch(processedUrl);
    const blob = await fetchRes.blob();
    const file = new File([blob], `vibe-cam-${Date.now()}.jpg`, { type: "image/jpeg" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Vibe Cam Photo',
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      const link = document.createElement('a');
      link.download = `vibe-cam-${Date.now()}.jpg`;
      link.href = processedUrl;
      link.click();
    }
  };

  // --- 移除功能核心邏輯 ---

  // 1. 處理塗抹動作
  const handleTouchStart = (e) => {
    if (activeTab !== 'remove') return;
    setIsDrawingMask(true);
    const point = getEventPoint(e);
    if (point) setRemoveMaskPoints(prev => [...prev, point]);
  };

  const handleTouchMove = (e) => {
    if (activeTab !== 'remove' || !isDrawingMask) return;
    e.preventDefault(); // 防止滾動
    const point = getEventPoint(e);
    if (point) setRemoveMaskPoints(prev => [...prev, point]);
  };

  const handleTouchEnd = () => {
    setIsDrawingMask(false);
    // 加入一個分隔點，代表一筆畫結束 (可選，目前簡單處理)
    setRemoveMaskPoints(prev => [...prev, null]);
  };

  // 獲取觸控/滑鼠相對圖片的座標
  const getEventPoint = (e) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // 計算相對座標 (0-1)
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  // 2. 繪製紅色遮罩 (在 UI 層)
  useEffect(() => {
    if (activeTab === 'remove' && maskCanvasRef.current && imgRef.current) {
        const canvas = maskCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = imgRef.current.getBoundingClientRect();
        
        // 設定 Canvas 大小與圖片顯示大小一致
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (removeMaskPoints.length > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
            ctx.lineWidth = brushSize;
            
            ctx.beginPath();
            let isFirst = true;
            
            removeMaskPoints.forEach(p => {
                if (!p) {
                    isFirst = true;
                    return; // 筆畫中斷
                }
                const px = p.x * canvas.width;
                const py = p.y * canvas.height;
                
                if (isFirst) {
                    ctx.moveTo(px, py);
                    isFirst = false;
                } else {
                    ctx.lineTo(px, py);
                }
            });
            ctx.stroke();
        }
    }
  }, [removeMaskPoints, activeTab, brushSize, processedUrl]); // processedUrl 變更時重繪(例如縮放)

  // 3. 執行智慧移除 (Inpainting Algorithm)
  const applySmartRemove = async () => {
    if (removeMaskPoints.length === 0 || !canvasRef.current) return;
    
    setIsProcessing(true);
    setAiAnalysisResult('AI 運算修復中...');
    
    // 讓 UI 有機會渲染 Loading
    await new Promise(r => setTimeout(r, 100));

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 1. 建立遮罩層 (在記憶體中)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = (brushSize / imgRef.current.width) * width; // 轉換筆刷大小比例
    maskCtx.strokeStyle = '#FFFFFF'; // 白色為遮罩
    
    maskCtx.beginPath();
    let isFirst = true;
    removeMaskPoints.forEach(p => {
        if (!p) { isFirst = true; return; }
        const px = p.x * width;
        const py = p.y * height;
        if (isFirst) { maskCtx.moveTo(px, py); isFirst = false; }
        else { maskCtx.lineTo(px, py); }
    });
    maskCtx.stroke();

    // 2. 執行簡易 Inpainting (Pixel Diffusion)
    // 这是一个簡化的算法：將原始圖片模糊後，填入遮罩區域，並加入雜訊
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    
    // 繪製原圖
    tCtx.drawImage(canvas, 0, 0);
    
    // 多次模糊取樣 (模擬擴散)
    ctx.save();
    // 使用 maskCanvas 作為裁切路徑
    ctx.globalCompositeOperation = 'source-over';
    
    // 這是一個視覺欺騙法：
    // 我們從遮罩邊緣向內取樣 (或是簡單地用模糊背景填補)
    // 1. 強力高斯模糊背景 (模擬平均色)
    tCtx.filter = 'blur(20px)';
    tCtx.drawImage(canvas, 0, 0); 
    
    // 2. 將模糊後的圖，只畫在遮罩區域 (使用 destination-in 或 clip)
    // 這裡我們直接在主 Canvas 上操作
    
    // 繪製遮罩區域
    const maskData = maskCtx.getImageData(0, 0, width, height).data;
    const imgData = ctx.getImageData(0, 0, width, height);
    const blurredData = tCtx.getImageData(0, 0, width, height).data;
    
    // 像素級操作 (這比 filter 更精準)
    for (let i = 0; i < maskData.length; i += 4) {
        // 如果是遮罩區域 (白色)
        if (maskData[i] > 0) {
            // 替換為模糊後的像素 (簡單修補)
            imgData.data[i] = blurredData[i];     // R
            imgData.data[i+1] = blurredData[i+1]; // G
            imgData.data[i+2] = blurredData[i+2]; // B
            
            // 加入一點雜訊以模擬紋理，不然會太糊
            const noise = (Math.random() - 0.5) * 20;
            imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
            imgData.data[i+1] = Math.min(255, Math.max(0, imgData.data[i+1] + noise));
            imgData.data[i+2] = Math.min(255, Math.max(0, imgData.data[i+2] + noise));
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
    ctx.restore();

    // 3. 更新狀態
    // 把目前的結果存為新的 Base Image，這樣可以疊加操作
    const newImg = new Image();
    newImg.src = canvas.toDataURL('image/jpeg', 0.9);
    newImg.onload = () => {
        setImage(newImg); // 更新主圖
        setRemoveMaskPoints([]); // 清空遮罩
        setIsProcessing(false);
        setAiAnalysisResult('');
    };
  };

  // --- 特效與濾鏡函數 (保持不變) ---
  const applyKira = (ctx, width, height, intensity) => {
    const sampleScale = 0.2; 
    const sw = Math.floor(width * sampleScale);
    const sh = Math.floor(height * sampleScale);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sw; tempCanvas.height = sh;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
    const imgData = tCtx.getImageData(0, 0, sw, sh);
    const data = imgData.data;
    const threshold = 255 - (intensity * 0.8); 
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'white';
    for (let y = 0; y < sh; y += 4) {
      for (let x = 0; x < sw; x += 4) {
        const i = (y * sw + x) * 4;
        const bri = (data[i] + data[i+1] + data[i+2]) / 3;
        if (bri > threshold && Math.random() > 0.98) {
             const size = (Math.random() * 20 + 10) * (width/1000); 
             const rx = x/sampleScale, ry = y/sampleScale;
             ctx.beginPath();
             ctx.ellipse(rx, ry, size, size/4, 0, 0, 2*Math.PI);
             ctx.ellipse(rx, ry, size, size/4, Math.PI/2, 0, 2*Math.PI);
             ctx.fill();
             ctx.beginPath(); ctx.arc(rx, ry, size/4, 0, 2*Math.PI); ctx.fill();
        }
      }
    }
    ctx.restore();
  };

  const applyLeak = (ctx, width, height, intensity) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; 
    for(let i=0; i<2; i++) {
        const x = Math.random() > 0.5 ? 0 : width; 
        const y = Math.random() * height;
        const radius = (Math.random() * 0.5 + 0.3) * width; 
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const opacity = (intensity / 100) * 0.8;
        gradient.addColorStop(0, `rgba(255, 200, 150, ${opacity})`);
        gradient.addColorStop(0.4, `rgba(255, 100, 50, ${opacity * 0.6})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  };

  const applyVignette = (ctx, width, height, intensity) => {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply'; 
    const radius = Math.max(width, height) * 0.8;
    const gradient = ctx.createRadialGradient(width/2, height/2, radius * 0.4, width/2, height/2, radius);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity/100})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  };

  const runAiOptimization = () => {
    if (!canvasRef.current || !image) return;
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    const sampleData = ctx.getImageData(width/2 - 50, height/2 - 50, 100, 100).data;
    let totalR = 0, totalG = 0, totalB = 0;
    for (let i = 0; i < sampleData.length; i += 4) {
      totalR += sampleData[i]; totalG += sampleData[i+1]; totalB += sampleData[i+2];
    }
    const count = sampleData.length / 4;
    const brightness = (totalR/count + totalG/count + totalB/count) / 3;
    let msg = "✨ AI 分析完成";
    let newBri = 100;
    if (brightness < 60) { newBri = 125; msg = "🌙 增強暗部細節"; } 
    else if (brightness > 200) { newBri = 90; msg = "☀️ 抑制過度曝光"; }
    setSettings(prev => ({ ...prev, brightness: newBri }));
    setAiAnalysisResult(msg);
    setTimeout(() => setAiAnalysisResult(''), 3000);
  };

  const processImage = useCallback(() => {
    if (!image || !canvasRef.current) return;
    // 如果正在塗抹遮罩，不重新渲染底圖，避免閃爍
    if (isDrawingMask) return; 

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const MAX_WIDTH = 1920; 
    let width = image.width;
    let height = image.height;
    if (width > MAX_WIDTH) {
      height = Math.floor((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const currentFilter = FILTERS.find(f => f.id === settings.filterId);
    
    if (currentFilter.type === 'bw') {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation'; 
        ctx.fillStyle = 'black'; 
        ctx.fillRect(0, 0, width, height); 
        ctx.restore();
    }

    if (settings.brightness !== 100 || settings.contrast !== 100 || currentFilter.contrast) {
        const bri = settings.brightness;
        const con = (settings.contrast / 100) * (currentFilter.contrast || 1);
        ctx.filter = `brightness(${bri}%) contrast(${con * 100}%)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none'; 
    }

    if (currentFilter.overlay) {
        ctx.save();
        ctx.globalCompositeOperation = currentFilter.overlay.mode;
        ctx.fillStyle = currentFilter.overlay.color;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    if (settings.effectId === 'kira') applyKira(ctx, width, height, settings.effectIntensity);
    if (settings.effectId === 'leak') applyLeak(ctx, width, height, settings.effectIntensity);
    if (settings.effectId === 'vignette') applyVignette(ctx, width, height, settings.effectIntensity);

    if (settings.showTimestamp) {
        const date = new Date();
        const str = `'${date.getFullYear().toString().slice(-2)} ${String(date.getMonth()+1).padStart(2,'0')} ${String(date.getDate()).padStart(2,'0')}`;
        const fontSize = width * 0.04;
        ctx.save();
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.fillStyle = '#ff9500';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(str, width - ctx.measureText(str).width - (width*0.05), height - (width*0.05));
        ctx.restore();
    }

    setProcessedUrl(canvas.toDataURL('image/jpeg', 0.9));
    setIsProcessing(false);
  }, [image, settings, isDrawingMask]); // 加入 isDrawingMask 依賴

  useEffect(() => {
    const timer = setTimeout(() => processImage(), 50);
    return () => clearTimeout(timer);
  }, [processImage]);

  const triggerFileInput = () => fileInputRef.current.click();

  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white p-6 font-sans">
        <div className="w-full max-w-md space-y-12 text-center flex flex-col items-center">
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-24 h-24 relative group cursor-pointer transition-transform hover:scale-105" onClick={triggerFileInput}>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <VibeLogo className="w-full h-full relative z-10 drop-shadow-2xl" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter italic bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                VIBE CAM
              </h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
                <Cpu size={12} className="text-orange-500" />
                <span>AI-Powered Engine</span>
              </div>
            </div>
          </div>

          <button onClick={triggerFileInput} className="group relative w-64 h-16 rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 cursor-pointer flex items-center justify-center transition-all active:scale-95 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-bold tracking-[0.2em] text-white flex items-center gap-3">
              <ImageIcon size={16} className="text-orange-500" />
              TAP TO START
            </span>
          </button>

          <div className="space-y-2 opacity-60">
            <div className="flex items-center justify-center gap-2 text-neutral-500 text-[10px] uppercase tracking-widest">
              <Smartphone size={12} />
              <span>Device Requirement</span>
            </div>
            <p className="text-[10px] text-neutral-600 max-w-[200px] mx-auto leading-relaxed">
              Optimized for iPhone 15 Pro+ <br/> or High-End Android Devices
            </p>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans select-none touch-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="pt-[env(safe-area-inset-top)] min-h-[env(safe-area-inset-top)] box-content h-14 px-4 flex items-center justify-between bg-black/80 backdrop-blur-md z-20 border-b border-white/5">
        <button onClick={() => setImage(null)} className="p-2 hover:bg-white/10 rounded-full text-neutral-400">
          <Undo2 size={20} />
        </button>
        <div className="flex items-center gap-2">
           <VibeLogo className="w-6 h-6" />
           <span className="font-black italic text-lg tracking-tighter bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">VIBE</span>
        </div>
        <button onClick={handleSave} className="bg-white text-black px-5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 active:scale-95 transition-transform">
          {navigator.share ? <Share size={14} /> : <Download size={14} />}
          {navigator.share ? 'SHARE' : 'SAVE'}
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative bg-neutral-900/50 p-4 flex flex-col justify-center overflow-hidden">
        {processedUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center"
               onPointerDown={activeTab === 'remove' ? handleTouchStart : () => setIsComparing(true)}
               onPointerUp={activeTab === 'remove' ? handleTouchEnd : () => setIsComparing(false)}
               onPointerLeave={activeTab === 'remove' ? handleTouchEnd : () => setIsComparing(false)}
               onPointerMove={activeTab === 'remove' ? handleTouchMove : undefined}
               onTouchStart={activeTab === 'remove' ? handleTouchStart : () => setIsComparing(true)}
               onTouchEnd={activeTab === 'remove' ? handleTouchEnd : () => setIsComparing(false)}
               onTouchMove={activeTab === 'remove' ? handleTouchMove : undefined}
               >
             
             {/* 頂部狀態 */}
             <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-20 pt-4">
                {aiAnalysisResult ? (
                   <div className="bg-black/60 backdrop-blur px-4 py-1.5 rounded-full text-xs text-orange-400 border border-orange-500/20 shadow-lg animate-in slide-in-from-top-2">
                     {aiAnalysisResult}
                   </div>
                ) : (
                  <div className={`bg-black/40 backdrop-blur px-3 py-1 rounded-full text-[10px] tracking-wider border border-white/5 transition-opacity ${isComparing ? 'opacity-100' : 'opacity-0'}`}>ORIGINAL</div>
                )}
             </div>

            {/* 主圖片顯示 */}
            <img 
              ref={imgRef}
              src={isComparing ? originalUrl : processedUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain shadow-2xl shadow-black select-none" 
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
              onContextMenu={(e) => e.preventDefault()} 
            />
            
            {/* 塗抹遮罩層 (僅在 Remove 模式顯示) */}
            <canvas 
                ref={maskCanvasRef}
                className={`absolute pointer-events-none ${activeTab === 'remove' ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    width: imgRef.current ? imgRef.current.width : '100%',
                    height: imgRef.current ? imgRef.current.height : '100%'
                }}
            />
            
            {/* 提示文字 (非 Remove 模式) */}
            {activeTab !== 'remove' && (
                <div className={`absolute bottom-4 text-[10px] text-neutral-500 tracking-widest uppercase transition-opacity ${isComparing ? 'opacity-0' : 'opacity-60'}`}>
                Press & Hold to Compare
                </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : <div className="animate-pulse bg-neutral-800 w-full h-full" />}
      </div>

      {/* Controls */}
      <div className="bg-black border-t border-white/5 pb-safe z-30">
        
        {/* Adjust - 簡化版 */}
        {activeTab === 'adjust' && (
          <div className="px-6 py-6 space-y-6 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-4">
               <span className="text-xs font-bold text-neutral-500 uppercase">Global Params</span>
               <button onClick={() => setSettings(s => ({...s, showTimestamp: !s.showTimestamp}))} className={`text-[10px] px-3 py-1 rounded-full border transition-colors ${settings.showTimestamp ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-700 text-neutral-400'}`}>DATE STAMP</button>
            </div>
            {/* 移除了亮度/對比滑桿，保持介面乾淨 */}
            <div className="text-center text-neutral-600 text-xs py-2">
              AUTO AI ENHANCEMENT ENABLED
            </div>
          </div>
        )}

        {/* Effects */}
        {activeTab === 'effects' && (
          <div className="px-6 py-6 space-y-6 animate-in slide-in-from-bottom-2">
             <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-bold text-neutral-500 uppercase">Action FX</span>
               {settings.effectId !== 'none' && <span className="text-[10px] text-orange-400 font-mono">{settings.effectIntensity}%</span>}
             </div>
             <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2">
                {EFFECTS.map(effect => (
                  <button key={effect.id} onClick={() => setSettings({...settings, effectId: effect.id})} className={`flex-shrink-0 px-4 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${settings.effectId === effect.id ? 'bg-neutral-800 border-orange-500 text-orange-500' : 'bg-neutral-900 border-transparent text-neutral-400'}`}>
                    {effect.icon}
                    <span className="text-[10px] font-bold">{effect.name}</span>
                  </button>
                ))}
             </div>
             {settings.effectId !== 'none' && (
               <input type="range" min="0" max="100" value={settings.effectIntensity} onChange={(e) => setSettings({...settings, effectIntensity: parseInt(e.target.value)})} className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500" />
             )}
          </div>
        )}

        {/* Filters */}
        {activeTab === 'filters' && (
          <div className="flex flex-col gap-4 py-4 animate-in slide-in-from-bottom-2">
            <div className="px-4 flex justify-end">
                <button onClick={runAiOptimization} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-orange-500 text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 text-neutral-300 hover:text-white group">
                  <Sparkles size={14} className="text-orange-500 group-hover:rotate-12 transition-transform" /> AI 場景優化
                </button>
            </div>
            <div className="flex overflow-x-auto px-4 gap-3 no-scrollbar pb-2">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setSettings({...settings, filterId: f.id})} className="flex-shrink-0 flex flex-col items-center gap-2 group relative">
                  <div className={`w-16 h-20 rounded-xl overflow-hidden border transition-all relative ${settings.filterId === f.id ? 'border-white scale-100 opacity-100' : 'border-transparent opacity-50 scale-95'}`}>
                     <img src={originalUrl} className="w-full h-full object-cover" style={f.type === 'bw' ? {filter: 'grayscale(100%)'} : {}} alt={f.name} />
                     {f.overlay && f.type !== 'bw' && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: f.overlay.color, mixBlendMode: f.overlay.mode }} />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${settings.filterId === f.id ? 'text-white' : 'text-neutral-600'}`}>{f.name}</span>
                  {settings.filterId === f.id && <div className="w-1 h-1 bg-orange-500 rounded-full absolute -bottom-1" />}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Remove Tab (New Logic) */}
        {activeTab === 'remove' && (
          <div className="px-6 py-6 space-y-4 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-bold text-neutral-500 uppercase">SMART REMOVER</span>
               <div className="flex gap-4">
                   <button onClick={() => setRemoveMaskPoints([])} className="text-xs text-neutral-400 flex items-center gap-1 hover:text-white"><Trash2 size={12}/> CLEAR</button>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
                <span className="text-[10px] text-neutral-400">BRUSH</span>
                <input type="range" min="5" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>

            <button 
                onClick={applySmartRemove} 
                disabled={removeMaskPoints.length === 0}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all"
            >
              <Eraser size={16} /> 
              {removeMaskPoints.length === 0 ? 'PAINT TO REMOVE' : 'APPLY REMOVAL'}
            </button>
            <p className="text-[9px] text-neutral-600 text-center uppercase tracking-wider">Use finger to paint over objects</p>
          </div>
        )}

        {/* Nav */}
        <div className="flex justify-center gap-8 items-center pt-2 pb-6 border-t border-white/5 bg-black">
          <button onClick={() => setActiveTab('filters')} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'filters' ? 'text-white' : 'text-neutral-600'}`}><Aperture size={20} /><span className="text-[9px] font-bold">FILTERS</span></button>
          <button onClick={() => setActiveTab('effects')} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'effects' ? 'text-white' : 'text-neutral-600'}`}><Stars size={20} /><span className="text-[9px] font-bold">FX</span></button>
          <button onClick={() => setActiveTab('remove')} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'remove' ? 'text-red-500' : 'text-neutral-600'}`}><Eraser size={20} /><span className="text-[9px] font-bold">REMOVE</span></button>
          <button onClick={() => setActiveTab('adjust')} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'adjust' ? 'text-white' : 'text-neutral-600'}`}><Sliders size={20} /><span className="text-[9px] font-bold">ADJUST</span></button>
        </div>
      </div>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }`}</style>
    </div>
  );
}