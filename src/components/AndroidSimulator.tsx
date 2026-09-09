import React, { useState, useEffect, useRef } from 'react';
import { Camera, RotateCcw, Zap, ZapOff, Trash2, Download, X, Image as ImageIcon, CheckCircle2, Sparkles, FileText, FileCheck } from 'lucide-react';
import { CapturedPhoto } from '../types';

interface AndroidSimulatorProps {
  onPhotoCountChange?: (count: number) => void;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({ onPhotoCountChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [bwResult, setBwResult] = useState<CapturedPhoto | null>(null);
  const [resultFilter, setResultFilter] = useState<'photocopy' | 'grayscale' | 'original'>('photocopy');
  const [showGallery, setShowGallery] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Start Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        currentStream = newStream;
        setStream(newStream);
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err: any) {
        console.warn('Camera access issue:', err);
        setHasPermission(false);
        setCameraError('دسترسی به دوربین توسط مرورگر مسدود شده یا دوربین در دسترس نیست.');
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Toast auto-hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleCapture = () => {
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 150);
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;

    let originalUrl = '';
    let grayscaleUrl = '';
    let photocopyUrl = '';

    if (canvas && video && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          // Flip horizontally for front camera
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        originalUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Compute Grayscale
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const grayBuf = new Uint8ClampedArray(d.length);
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          grayBuf[i] = g;
          grayBuf[i + 1] = g;
          grayBuf[i + 2] = g;
          grayBuf[i + 3] = 255;
        }
        const grayImgData = new ImageData(grayBuf, canvas.width, canvas.height);
        ctx.putImageData(grayImgData, 0, 0);
        grayscaleUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Compute High-Contrast Photocopy (Paper whitening + Ink dark enhancement)
        const photoBuf = new Uint8ClampedArray(d.length);
        const contrast = 2.05;
        const offset = -128 * (contrast - 1) + 38;
        for (let i = 0; i < d.length; i += 4) {
          const g = grayBuf[i];
          const val = Math.max(0, Math.min(255, Math.round(contrast * (g - 128) + 128 + offset)));
          photoBuf[i] = val;
          photoBuf[i + 1] = val;
          photoBuf[i + 2] = val;
          photoBuf[i + 3] = 255;
        }
        const photoImgData = new ImageData(photoBuf, canvas.width, canvas.height);
        ctx.putImageData(photoImgData, 0, 0);
        photocopyUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    } else {
      // Fallback: Generate realistic Iranian ID card / Document mockup
      const docCanvas = document.createElement('canvas');
      docCanvas.width = 640;
      docCanvas.height = 420;
      const ctx = docCanvas.getContext('2d')!;

      // Background card gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 420);
      grad.addColorStop(0, '#e2e8f0');
      grad.addColorStop(0.5, '#cbd5e1');
      grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 420);

      // Card outer border
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#059669';
      ctx.strokeRect(10, 10, 620, 400);

      // Header strip
      ctx.fillStyle = '#065f46';
      ctx.fillRect(10, 10, 620, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('جمهوری اسلامی ایران - کارت شناسایی ملی', 320, 42);

      // Document Photo Box (Left in RTL or Right)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(40, 80, 120, 160);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 80, 120, 160);

      // Silhouette avatar inside photo box
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(100, 130, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(100, 220, 55, Math.PI, Math.PI * 2);
      ctx.fill();

      // Text information fields
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px Vazirmatn, sans-serif';
      ctx.fillText('نام و نام خانوادگی: علی محمدی', 590, 110);
      ctx.fillText('شماره ملی: ۰۰۱۲۳۴۵۶۷۸', 590, 150);
      ctx.fillText('تاریخ تولد: ۱۳۶۸/۰۴/۱۵', 590, 190);
      ctx.fillText('شماره شناسنامه: ۴۲۸۹', 590, 230);
      ctx.fillText('تاریخ اعتبار مدرک: ۱۴۰۸/۰۴/۱۵', 590, 270);

      // Official Stamp Circle
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(280, 280, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 13px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ثبت احوال کشور', 280, 275);
      ctx.fillText('مهر رسمی', 280, 295);

      // Barcode strip
      ctx.fillStyle = '#0f172a';
      for (let x = 40; x < 600; x += 6) {
        const barW = (x % 12 === 0) ? 4 : 2;
        ctx.fillRect(x, 345, barW, 45);
      }

      originalUrl = docCanvas.toDataURL('image/jpeg', 0.92);

      // Compute Grayscale for dummy
      const imgData = ctx.getImageData(0, 0, 640, 420);
      const d = imgData.data;
      const grayBuf = new Uint8ClampedArray(d.length);
      for (let i = 0; i < d.length; i += 4) {
        const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        grayBuf[i] = g;
        grayBuf[i + 1] = g;
        grayBuf[i + 2] = g;
        grayBuf[i + 3] = 255;
      }
      const grayImgData = new ImageData(grayBuf, 640, 420);
      ctx.putImageData(grayImgData, 0, 0);
      grayscaleUrl = docCanvas.toDataURL('image/jpeg', 0.92);

      // Compute Photocopy for dummy
      const photoBuf = new Uint8ClampedArray(d.length);
      const contrast = 2.1;
      const offset = -128 * (contrast - 1) + 40;
      for (let i = 0; i < d.length; i += 4) {
        const g = grayBuf[i];
        const val = Math.max(0, Math.min(255, Math.round(contrast * (g - 128) + 128 + offset)));
        photoBuf[i] = val;
        photoBuf[i + 1] = val;
        photoBuf[i + 2] = val;
        photoBuf[i + 3] = 255;
      }
      const photoImgData = new ImageData(photoBuf, 640, 420);
      ctx.putImageData(photoImgData, 0, 0);
      photocopyUrl = docCanvas.toDataURL('image/jpeg', 0.92);
    }

    setTimeout(() => {
      setIsProcessing(false);

      const newPhoto: CapturedPhoto = {
        id: Date.now().toString(),
        dataUrl: photocopyUrl,
        photocopyUrl,
        grayscaleUrl,
        originalUrl,
        timestamp: new Intl.DateTimeFormat('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date()),
        sizeKb: Math.round(photocopyUrl.length * 0.75 / 1024),
      };

      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      setBwResult(newPhoto);
      setResultFilter('photocopy');
      onPhotoCountChange?.(updated.length);
      showToast('مدرک اسکن و به نسخه فتوکپی تبدیل شد');
    }, 200);
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    showToast(facingMode === 'environment' ? 'دوربین جلو فعال شد' : 'دوربین اصلی فعال شد');
  };

  const handleToggleFlash = () => {
    if (flashMode === 'auto') {
      setFlashMode('on');
      showToast('فلاش: روشن');
    } else if (flashMode === 'on') {
      setFlashMode('off');
      showToast('فلاش: خاموش');
    } else {
      setFlashMode('auto');
      showToast('فلاش: خودکار');
    }
  };

  const handleDeletePhoto = (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    onPhotoCountChange?.(updated.length);
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    showToast('عکس حذف شد');
  };

  const handleDownloadPhoto = (photo: CapturedPhoto) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `PersianCamera_${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="android-simulator-container" className="flex flex-col items-center justify-center w-full">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Modern Android Device Mockup (9:19.5 aspect ratio) */}
      <div className="relative w-full max-w-[360px] h-[680px] bg-neutral-950 rounded-[44px] p-3 shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700/50 flex flex-col overflow-hidden select-none">
        
        {/* Device Top Speaker & Camera Punch-hole */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center">
          <div className="w-12 h-3 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800">
            <div className="w-2.5 h-2.5 bg-neutral-950 rounded-full border border-neutral-700" />
          </div>
        </div>

        {/* Screen Content Container (Android RTL) */}
        <div className="relative flex-1 bg-black rounded-[36px] overflow-hidden flex flex-col" dir="rtl">
          
          {/* Status Bar */}
          <div className="h-7 w-full flex items-center justify-between px-6 text-[11px] font-medium text-neutral-300 z-20 bg-neutral-950/40 backdrop-blur-sm">
            <span>{new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-emerald-400 font-semibold">4G+</span>
              <span>88%</span>
            </div>
          </div>

          {/* Top Camera Header Bar (RTL) */}
          <div className="h-14 w-full flex items-center justify-between px-4 z-20 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-tight text-white">اسکنر و فتوکپی مدارک</span>
            </div>
            
            <button
              id="flash-toggle-btn"
              onClick={handleToggleFlash}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-neutral-200"
              title="حالت فلاش"
            >
              {flashMode === 'off' ? (
                <ZapOff className="w-5 h-5 text-neutral-400" />
              ) : (
                <Zap className={`w-5 h-5 ${flashMode === 'on' ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
              )}
            </button>
          </div>

          {/* Camera Viewfinder Area */}
          <div className="relative flex-1 bg-neutral-900 flex items-center justify-center overflow-hidden">
            {/* Live Video Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
            />

            {/* Document Guide Frame Overlay (کادر راهنمای تراز مدرک) */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
              <div className="w-full max-w-[260px] aspect-[1/1.38] border-2 border-dashed border-emerald-400/80 rounded-2xl relative flex flex-col justify-between p-3">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                {/* Top alignment badge */}
                <div className="self-center bg-black/75 backdrop-blur-sm text-[10px] text-emerald-300 font-medium px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  مدرک یا کارت را داخل کادر تنظیم کنید
                </div>

                {/* Center scan hint */}
                <div className="self-center text-[10px] text-neutral-300/80 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  تبدیل خودکار به نسخه فتوکپی
                </div>
              </div>
            </div>

            {/* If camera permission is not granted or blocked, show informative Persian banner with fallback capture */}
            {cameraError && (
              <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center p-6 text-center z-15">
                <Camera className="w-12 h-12 text-neutral-500 mb-3" />
                <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mb-3">
                  دوربین وب غیرفعال است؛ با زدن دکمه شاتر، یک نمونه کارت شناسایی رسمی به صورت فتوکپی شبیه‌سازی و اسکن می‌شود.
                </p>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-1 rounded-md">
                  در فایل APK روی گوشی، از سخت‌افزار دوربین گوشی استفاده می‌شود
                </span>
              </div>
            )}

            {/* Shutter White Flash Overlay */}
            {isShutterActive && (
              <div className="absolute inset-0 bg-white z-30 animate-ping opacity-90" />
            )}

            {/* Processing Spinner Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center z-30 gap-2">
                <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white font-medium">در حال تبدیل به فتوکپی...</span>
              </div>
            )}

            {/* Persian Toast Notification in Android screen */}
            {toastMessage && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-neutral-900/95 border border-neutral-700 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-md animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            )}
          </div>

          {/* Bottom Android Camera Controls Bar (RTL) */}
          <div className="h-28 w-full bg-black/90 px-6 flex items-center justify-between z-20">
            {/* Gallery Thumbnail Preview (RTL start) */}
            <button
              id="gallery-preview-btn"
              onClick={() => setShowGallery(true)}
              className="relative w-12 h-12 rounded-xl bg-neutral-800 border-2 border-neutral-600/80 overflow-hidden flex items-center justify-center hover:border-emerald-400 transition-colors"
              title="مشاهده مدارک اسکن شده"
            >
              {photos.length > 0 ? (
                <>
                  <img src={photos[0].photocopyUrl || photos[0].dataUrl} alt="آخرین مدرک" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-emerald-300 text-[9px] font-bold px-1 rounded-sm">
                    {photos.length}
                  </span>
                </>
              ) : (
                <ImageIcon className="w-5 h-5 text-neutral-400" />
              )}
            </button>

            {/* Main Shutter Capture Button */}
            <button
              id="shutter-capture-btn"
              onClick={handleCapture}
              className="w-18 h-18 rounded-full border-4 border-white p-1.5 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              title="اسکن و فتوکپی مدرک"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-neutral-300 transition-colors shadow-inner flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-400/40" />
              </div>
            </button>

            {/* Switch Camera Button (Front/Back) */}
            <button
              id="switch-camera-btn"
              onClick={handleSwitchCamera}
              className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-white hover:bg-neutral-700 active:scale-95 transition-all"
              title="تغییر دوربین جلو و پشت"
            >
              <RotateCcw className="w-5 h-5 text-neutral-200" />
            </button>
          </div>

          {/* Android Home Navigation Indicator */}
          <div className="h-3 w-full bg-black flex items-center justify-center pb-1">
            <div className="w-28 h-1 bg-neutral-600 rounded-full" />
          </div>

          {/* Gallery Modal (Inside Android Screen) */}
          {showGallery && (
            <div className="absolute inset-0 z-40 bg-neutral-950 flex flex-col animate-fade-in" dir="rtl">
              {/* Header */}
              <div className="h-14 px-4 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm text-white">مدارک اسکن شده ({photos.length})</span>
                </div>
                <button
                  onClick={() => setShowGallery(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photos Grid */}
              <div className="flex-1 overflow-y-auto p-3">
                {photos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2 text-center">
                    <FileText className="w-10 h-10 stroke-1 text-neutral-600" />
                    <p className="text-xs">هنوز مدرکی اسکن نشده است.</p>
                    <span className="text-[11px] text-neutral-500">با زدن دکمه شاتر، مدارک را فتوکپی و اسکن کنید.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map(photo => (
                      <div
                        key={photo.id}
                        className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-square cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img src={photo.photocopyUrl || photo.dataUrl} alt="مدرک" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-center justify-between text-[10px] text-neutral-300">
                          <span>{photo.timestamp}</span>
                          <span>فتوکپی</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Single Photo Viewer Modal */}
              {selectedPhoto && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col">
                  <div className="h-12 px-3 border-b border-neutral-800 flex items-center justify-between text-white">
                    <span className="text-xs text-neutral-300">{selectedPhoto.timestamp}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPhoto(selectedPhoto)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400"
                        title="دانلود مدرک"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(selectedPhoto.id)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-red-950 text-red-400"
                        title="حذف مدرک"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedPhoto(null)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-2 bg-neutral-950">
                    <img src={selectedPhoto.photocopyUrl || selectedPhoto.dataUrl} alt="بزرگنمایی" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Automatic Photocopy Result Screen Overlay (نمایش خودکار نسخه فتوکپی مدرک) */}
          {bwResult && (
            <div id="bw-result-overlay" className="absolute inset-0 z-40 bg-neutral-950 flex flex-col animate-fade-in" dir="rtl">
              {/* Header */}
              <div className="h-14 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm text-white">نسخه فتوکپی مدرک</span>
                </div>
                <span className="text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full font-medium">
                  وضوح بالا و بهینه‌شده
                </span>
              </div>

              {/* Filter Selection Chips Bar */}
              <div className="py-2.5 px-4 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-center gap-2">
                <button
                  onClick={() => setResultFilter('photocopy')}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    resultFilter === 'photocopy'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  فتوکپی واضح
                </button>
                <button
                  onClick={() => setResultFilter('grayscale')}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    resultFilter === 'grayscale'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  اسکن نرم
                </button>
                <button
                  onClick={() => setResultFilter('original')}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                    resultFilter === 'original'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  رنگ اصلی
                </button>
              </div>

              {/* Document Photo Display */}
              <div className="flex-1 flex items-center justify-center p-4 bg-neutral-950 overflow-hidden relative">
                <img
                  src={
                    resultFilter === 'photocopy'
                      ? (bwResult.photocopyUrl || bwResult.dataUrl)
                      : resultFilter === 'grayscale'
                      ? (bwResult.grayscaleUrl || bwResult.dataUrl)
                      : (bwResult.originalUrl || bwResult.dataUrl)
                  }
                  alt="تصویر مدرک"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-neutral-700 bg-white"
                />
              </div>

              {/* Bottom Actions Bar */}
              <div className="p-4 bg-neutral-900/90 border-t border-neutral-800 flex flex-col gap-2">
                <button
                  id="btn-take-another-photo"
                  onClick={() => setBwResult(null)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>اسکن مدرک جدید</span>
                </button>
                <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
                  <span>ساعت اسکن: {bwResult.timestamp}</span>
                  <button
                    onClick={() => {
                      const activeImg =
                        resultFilter === 'photocopy'
                          ? (bwResult.photocopyUrl || bwResult.dataUrl)
                          : resultFilter === 'grayscale'
                          ? (bwResult.grayscaleUrl || bwResult.dataUrl)
                          : (bwResult.originalUrl || bwResult.dataUrl);
                      handleDownloadPhoto({ ...bwResult, dataUrl: activeImg });
                    }}
                    className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ذخیره در دستگاه</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
