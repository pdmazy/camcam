import React, { useState, useEffect, useRef } from 'react';
import { Camera, RotateCcw, Zap, ZapOff, Trash2, Download, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
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
  const [showGallery, setShowGallery] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isShutterActive, setIsShutterActive] = useState(false);
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

    const canvas = canvasRef.current;
    const video = videoRef.current;

    let dataUrl = '';

    if (canvas && video && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          // Flip horizontally for front camera selfie
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    } else {
      // Fallback simulated photo capture if hardware camera is not permitted
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 640;
      dummyCanvas.height = 480;
      const ctx = dummyCanvas.getContext('2d')!;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(320, 240, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('عکس ثبت شده با دوربین فارسی', 320, 248);
      dataUrl = dummyCanvas.toDataURL('image/jpeg', 0.85);
    }

    const newPhoto: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date()),
      sizeKb: Math.round(dataUrl.length * 0.75 / 1024),
    };

    const updated = [newPhoto, ...photos];
    setPhotos(updated);
    onPhotoCountChange?.(updated.length);
    showToast('عکس با موفقیت در گالری ذخیره شد');
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
              <Camera className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm tracking-tight text-white">دوربین فارسی</span>
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

            {/* If camera permission is not granted or blocked, show informative Persian banner with fallback capture */}
            {cameraError && (
              <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
                <Camera className="w-12 h-12 text-neutral-500 mb-3" />
                <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mb-3">
                  دوربین وب غیرفعال است؛ نگران نباشید، با زدن دکمه شاتر می‌توانید عکاسی شبیه‌سازی‌شده را تست کنید و عکس ذخیره کنید.
                </p>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-1 rounded-md">
                  در فایل APK روی گوشی، از سخت‌افزار واقعی دوربین استفاده می‌شود
                </span>
              </div>
            )}

            {/* Shutter White Flash Overlay */}
            {isShutterActive && (
              <div className="absolute inset-0 bg-white z-30 animate-ping opacity-90" />
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
              title="مشاهده عکس‌های ذخیره شده"
            >
              {photos.length > 0 ? (
                <>
                  <img src={photos[0].dataUrl} alt="آخرین عکس" className="w-full h-full object-cover" />
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
              title="ثبت عکس"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-neutral-300 transition-colors shadow-inner" />
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
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm text-white">عکس‌های ذخیره شده ({photos.length})</span>
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
                    <ImageIcon className="w-10 h-10 stroke-1 text-neutral-600" />
                    <p className="text-xs">هنوز عکسی ثبت نشده است.</p>
                    <span className="text-[11px] text-neutral-500">با زدن دکمه سفید شاتر، عکس جدید بگیرید.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {photos.map(photo => (
                      <div
                        key={photo.id}
                        className="group relative rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-square cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <img src={photo.dataUrl} alt="عکس" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-center justify-between text-[10px] text-neutral-300">
                          <span>{photo.timestamp}</span>
                          <span>{photo.sizeKb} کیلوبایت</span>
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
                        title="دانلود عکس"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(selectedPhoto.id)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-red-950 text-red-400"
                        title="حذف عکس"
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
                    <img src={selectedPhoto.dataUrl} alt="بزرگنمایی" className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
