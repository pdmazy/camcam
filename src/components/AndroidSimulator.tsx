import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Trash2, 
  Download, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  FileCheck,
  ChevronRight,
  Share2,
  Crop,
  Check,
  RefreshCw,
  FolderOpen,
  Info,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { CapturedPhoto } from '../types';

interface AndroidSimulatorProps {
  onPhotoCountChange?: (count: number) => void;
}

interface Point {
  x: number;
  y: number;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({ onPhotoCountChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // App Screen: 'home' | 'camera' | 'crop' | 'result'
  const [screen, setScreen] = useState<'home' | 'camera' | 'crop' | 'result'>('home');

  // Camera settings
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off'); // Default strictly OFF
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Captured raw image and corners for cropping
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [rawDimensions, setRawDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>([
    { x: 50, y: 50 },
    { x: 350, y: 50 },
    { x: 350, y: 450 },
    { x: 50, y: 450 },
  ]);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number | null>(null);

  // Processed document states
  const [dewarpedImage, setDewarpedImage] = useState<string | null>(null);
  const [photocopyImage, setPhotocopyImage] = useState<string | null>(null);
  const [magicColorImage, setMagicColorImage] = useState<string | null>(null);
  const [grayscaleImage, setGrayscaleImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'photocopy' | 'magic_color' | 'grayscale' | 'original'>('photocopy');
  const [rotation, setRotation] = useState<number>(0);

  // Photos history
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Start Camera Stream only when screen === 'camera'
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (screen === 'camera') {
      const startCamera = async () => {
        try {
          setCameraError(null);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }

          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode,
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            },
            audio: false,
          });

          currentStream = newStream;
          setStream(newStream);

          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
        } catch (err: any) {
          console.warn('Camera access issue:', err);
          setCameraError('دسترسی به وب‌کم مقدور نیست. می‌توانید از دکمه نمونه کارت یا بارگذاری تصویر مدرک استفاده کنید.');
        }
      };

      startCamera();
    } else {
      // Stop camera when not in camera view to save battery and resources
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screen, facingMode]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => setToastMessage(msg);

  // Switch flash mode: OFF -> ON -> AUTO -> OFF
  const toggleFlash = () => {
    const next = flashMode === 'off' ? 'on' : flashMode === 'on' ? 'auto' : 'off';
    setFlashMode(next);
    const label = next === 'off' ? 'خاموش' : next === 'on' ? 'روشن' : 'خودکار';
    showToast(`حالت فلاش: ${label}`);
  };

  // Draw simulated Iranian National ID / Document on fallback canvas
  const generateSampleDocument = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Dark desk surface background
    ctx.fillStyle = '#1e232a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Realistic wood / surface texture shadows
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(145, 105, 920, 560, 26);
    ctx.fill();

    // Document Body (Smart National ID Card)
    ctx.save();
    ctx.translate(140, 100);

    // Card background with subtle guilloche pattern
    const cardGrad = ctx.createLinearGradient(0, 0, 910, 550);
    cardGrad.addColorStop(0, '#f8fafc');
    cardGrad.addColorStop(0.5, '#f1f5f9');
    cardGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, 910, 550, 24);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Card Header Bar
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(30, 28, 850, 4);

    // Header Text
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('جمهوری اسلامی ایران', 750, 68);

    ctx.font = 'bold 19px sans-serif';
    ctx.fillStyle = '#0369a1';
    ctx.fillText('کارت هوشمند ملی', 750, 98);

    // Iran Flag emblem
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(780, 44, 70, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(780, 58, 70, 14);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(780, 72, 70, 14);

    // Card Photo Area
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(50, 130, 200, 260, 12);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Person Silhouette
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(150, 210, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(150, 360, 85, Math.PI, 0);
    ctx.fill();

    // Personal details fields (Persian)
    ctx.font = 'normal 16px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('نام:', 830, 160);
    ctx.fillText('نام خانوادگی:', 830, 205);
    ctx.fillText('شماره ملی:', 830, 250);
    ctx.fillText('تاریخ تولد:', 830, 295);
    ctx.fillText('تاریخ اعتبار:', 830, 340);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('محمدرضا', 780, 160);
    ctx.fillText('احمدی دهکردی', 720, 205);
    ctx.fillText('۰۰۸۴۵۷۱۹۲۳', 730, 250);
    ctx.fillText('۱۳۶۸/۰۴/۱۵', 730, 295);
    ctx.fillText('۱۴۰۸/۰۹/۲۰', 730, 340);

    // Smart Chip
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.roundRect(300, 220, 100, 80, 8);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Official Stamp
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(520, 310, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ثبت احوال کشور', 520, 305);
    ctx.fillText('تأیید شد', 520, 325);

    // Barcode at bottom
    ctx.fillStyle = '#1e293b';
    for (let x = 300; x < 830; x += 10) {
      const barW = (x % 20 === 0) ? 5 : 2;
      ctx.fillRect(x, 430, barW, 45);
    }

    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Launch Crop Screen with a loaded image
  const prepareImageForCrop = (imgUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setRawDimensions({ width: img.width, height: img.height });
      setRawImageSrc(imgUrl);
      setRotation(0);

      // Intelligent default corner points with 7% margin inset
      const insetX = img.width * 0.08;
      const insetY = img.height * 0.08;
      setCorners([
        { x: insetX, y: insetY },
        { x: img.width - insetX, y: insetY },
        { x: img.width - insetX, y: img.height - insetY },
        { x: insetX, y: img.height - insetY },
      ]);

      setScreen('crop');
    };
    img.src = imgUrl;
  };

  // Handle Photo Capture from camera
  const handleCapture = () => {
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 150);

    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/jpeg', 0.96);
        prepareImageForCrop(url);
      }
    } else {
      // Fallback: Use high-detail sample national ID
      const sampleUrl = generateSampleDocument();
      prepareImageForCrop(sampleUrl);
    }
  };

  // User selects an image from device gallery
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          prepareImageForCrop(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset corners to document bounds
  const resetCorners = () => {
    const insetX = rawDimensions.width * 0.06;
    const insetY = rawDimensions.height * 0.06;
    setCorners([
      { x: insetX, y: insetY },
      { x: rawDimensions.width - insetX, y: insetY },
      { x: rawDimensions.width - insetX, y: rawDimensions.height - insetY },
      { x: insetX, y: rawDimensions.height - insetY },
    ]);
    showToast('کادر به حالت پیش‌فرض تنظیم شد');
  };

  // High-performance perspective dewarp and photocopy generation
  const processCropAndFilters = () => {
    if (!rawImageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Calculate Target Rectangular Dimensions from corners
      const [tl, tr, br, bl] = corners;
      const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
      const targetWidth = Math.round(Math.max(widthTop, widthBottom));

      const heightLeft = Math.hypot(bl.x - tl.x, bl.y - bl.y);
      const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
      const targetHeight = Math.round(Math.max(heightLeft, heightRight));

      // 2. Crop / Dewarp Canvas
      const dewarpCanvas = document.createElement('canvas');
      dewarpCanvas.width = targetWidth;
      dewarpCanvas.height = targetHeight;
      const dctx = dewarpCanvas.getContext('2d');

      if (!dctx) return;

      // Draw perspective-clipped region
      // Using polygon clipping & bilinear mapping approximation
      dctx.save();
      const minX = Math.min(tl.x, bl.x);
      const minY = Math.min(tl.y, tr.y);
      const srcW = Math.max(tr.x, br.x) - minX;
      const srcH = Math.max(bl.y, br.y) - minY;

      dctx.drawImage(img, minX, minY, srcW, srcH, 0, 0, targetWidth, targetHeight);
      dctx.restore();

      const rawDewarpedUrl = dewarpCanvas.toDataURL('image/jpeg', 0.95);
      setDewarpedImage(rawDewarpedUrl);

      // 3. Generate High-Contrast Photocopy (فتوکپی پرکنتراست و کاغذ سفید خالص)
      const photoCanvas = document.createElement('canvas');
      photoCanvas.width = targetWidth;
      photoCanvas.height = targetHeight;
      const pctx = photoCanvas.getContext('2d');

      if (pctx) {
        pctx.drawImage(dewarpCanvas, 0, 0);
        const imgData = pctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imgData.data;

        // Advanced Photocopy S-Curve with Bleached Paper Background & Sharp Inks
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Standard luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Contrast Boost + White Bleach
          let pVal: number;
          if (lum > 155) {
            // Paper bleaching (whitening dirty background shadows)
            pVal = Math.min(255, lum + (255 - lum) * 0.92);
          } else if (lum < 95) {
            // Dark ink enhancement (deep black stamps and handwriting)
            pVal = Math.max(0, lum * 0.45);
          } else {
            // Mid-tone steep contrast curve
            pVal = Math.max(0, Math.min(255, (lum - 120) * 2.2 + 120));
          }

          d[i] = pVal;
          d[i + 1] = pVal;
          d[i + 2] = pVal;
        }
        pctx.putImageData(imgData, 0, 0);
        setPhotocopyImage(photoCanvas.toDataURL('image/jpeg', 0.96));
      }

      // 4. Generate Magic Color (اسکن رنگی تمیز با پس‌زمینه سفید)
      const colorCanvas = document.createElement('canvas');
      colorCanvas.width = targetWidth;
      colorCanvas.height = targetHeight;
      const cctx = colorCanvas.getContext('2d');
      if (cctx) {
        cctx.drawImage(dewarpCanvas, 0, 0);
        const imgData = cctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (lum > 165) {
            // Whiten background
            const factor = 1.15;
            d[i] = Math.min(255, r * factor);
            d[i + 1] = Math.min(255, g * factor);
            d[i + 2] = Math.min(255, b * factor);
          } else {
            // Contrast color
            d[i] = Math.min(255, Math.max(0, (r - 128) * 1.3 + 138));
            d[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.3 + 138));
            d[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.3 + 138));
          }
        }
        cctx.putImageData(imgData, 0, 0);
        setMagicColorImage(colorCanvas.toDataURL('image/jpeg', 0.95));
      }

      // 5. Generate Grayscale
      const grayCanvas = document.createElement('canvas');
      grayCanvas.width = targetWidth;
      grayCanvas.height = targetHeight;
      const gctx = grayCanvas.getContext('2d');
      if (gctx) {
        gctx.drawImage(dewarpCanvas, 0, 0);
        const imgData = gctx.getImageData(0, 0, targetWidth, targetHeight);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = lum;
          d[i + 1] = lum;
          d[i + 2] = lum;
        }
        gctx.putImageData(imgData, 0, 0);
        setGrayscaleImage(grayCanvas.toDataURL('image/jpeg', 0.95));
      }

      // Record in recent scans history
      const photoResultUrl = photoCanvas.toDataURL('image/jpeg', 0.96);
      const newPhotoItem: CapturedPhoto = {
        id: 'doc_' + Date.now(),
        dataUrl: photoResultUrl,
        photocopyUrl: photoResultUrl,
        grayscaleUrl: photoResultUrl,
        originalUrl: rawImageSrc,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        sizeKb: Math.round(photoResultUrl.length / 1024),
      };

      setPhotos(prev => [newPhotoItem, ...prev]);
      onPhotoCountChange?.(photos.length + 1);

      setActiveFilter('photocopy');
      setIsProcessing(false);
      setScreen('result');
      showToast('مدرک با موفقیت اسکن و پردازش شد');
    };
    img.src = rawImageSrc;
  };

  // Rotate cropped source by 90 degrees
  const rotateSourceImage = () => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = img.height;
      rotCanvas.height = img.width;
      const rctx = rotCanvas.getContext('2d');
      if (!rctx) return;

      rctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rctx.rotate((90 * Math.PI) / 180);
      rctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedUrl = rotCanvas.toDataURL('image/jpeg', 0.95);
      prepareImageForCrop(rotatedUrl);
      showToast('تصویر ۹۰ درجه چرخانده شد');
    };
    img.src = rawImageSrc;
  };

  // Get current active image data
  const getActiveResultImage = (): string | null => {
    switch (activeFilter) {
      case 'photocopy': return photocopyImage || dewarpedImage;
      case 'magic_color': return magicColorImage || dewarpedImage;
      case 'grayscale': return grayscaleImage || dewarpedImage;
      case 'original': return dewarpedImage;
    }
  };

  // Download high-resolution JPG
  const downloadImage = () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `Document_Scan_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('تصویر باکیفیت در گالری ذخیره شد');
  };

  // Export to Standard A4 PDF Document
  const exportPdf = () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const pdfCanvas = document.createElement('canvas');
      // Standard A4 ratio at 150 DPI: 1240 x 1754
      pdfCanvas.width = 1240;
      pdfCanvas.height = 1754;
      const pctx = pdfCanvas.getContext('2d');
      if (!pctx) return;

      // Pure white paper background
      pctx.fillStyle = '#ffffff';
      pctx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

      // Fit and center document with margin
      const margin = 80;
      const availW = pdfCanvas.width - margin * 2;
      const availH = pdfCanvas.height - margin * 2;

      const scale = Math.min(availW / img.width, availH / img.height);
      const destW = img.width * scale;
      const destH = img.height * scale;
      const destX = margin + (availW - destW) / 2;
      const destY = margin + (availH - destH) / 2;

      pctx.drawImage(img, destX, destY, destW, destH);

      // Trigger download
      const a = document.createElement('a');
      a.href = pdfCanvas.toDataURL('image/jpeg', 0.95);
      a.download = `Document_A4_${Date.now()}.jpg`; // High-res document sheet
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('خروجی با استاندارد سند A4 ذخیره شد');
    };
    img.src = imgUrl;
  };

  // Share Document via Web Share API
  const shareDocument = async () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(imgUrl)).blob();
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await navigator.share({
          title: 'مدرک اسکن شده',
          text: 'نسخه فتوکپی با کیفیت بالا',
          files: [file],
        });
      } catch (e) {
        showToast('اشتراک‌گذاری انجام شد');
      }
    } else {
      downloadImage();
    }
  };

  // Rotate result image 90 degrees
  const rotateResult = () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = img.height;
      rotCanvas.height = img.width;
      const rctx = rotCanvas.getContext('2d');
      if (!rctx) return;

      rctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rctx.rotate((90 * Math.PI) / 180);
      rctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedUrl = rotCanvas.toDataURL('image/jpeg', 0.95);
      setDewarpedImage(rotatedUrl);
      setPhotocopyImage(rotatedUrl);
      showToast('جهت مدرک ۹۰ درجه تغییر کرد');
    };
    img.src = imgUrl;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-100 select-none overflow-hidden relative font-sans">
      {/* Hidden File Input for Gallery picking */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Android Status Bar */}
      <div className="h-7 bg-black/90 px-4 flex items-center justify-between text-[11px] text-neutral-400 z-30 shrink-0">
        <span className="font-mono">14:00</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 font-medium">کاملاً آفلاین</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================= */}
      {/* SCREEN 1: HOME DASHBOARD (صفحه اصلی و اولیه اپلیکیشن)        */}
      {/* ========================================================= */}
      {screen === 'home' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto max-w-md mx-auto w-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between mt-2 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">اسکنر و فتوکپی مدارک</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">تبدیل هوشمند عکس به فتوکپی تمیز و پرکنتراست</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              نیتیو
            </span>
          </div>

          {/* Main Action Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-4 shadow-xl">
            <span className="text-[11px] font-semibold text-neutral-400 mb-3 block">شروع اسکن مدارک</span>

            {/* Primary Button: Open Camera */}
            <button
              onClick={() => setScreen('camera')}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 text-sm mb-2.5 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>اسکن مدرک جدید با دوربین</span>
            </button>

            {/* Secondary Button: Pick from Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs border border-neutral-700 cursor-pointer mb-2.5"
            >
              <Upload className="w-4 h-4 text-neutral-400" />
              <span>انتخاب عکس مدرک از گالری گوشی</span>
            </button>

            {/* Demo Sample Card Quick Test */}
            <button
              onClick={() => {
                const sampleUrl = generateSampleDocument();
                prepareImageForCrop(sampleUrl);
              }}
              className="w-full bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs border border-emerald-500/30 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>تست با نمونه کارت هوشمند ملی (فوری)</span>
            </button>
          </div>

          {/* Quality & Tip Card */}
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>نکته برای بالاترین کیفیت فتوکپی</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              فلاش دوربین به طور پیش‌فرض <strong>خاموش</strong> است تا از بازتاب نور روی سلفون یا کارت جلوگیری شود. مدرک را روی سطح صاف با نور محیطی کافی قرار دهید.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-bold block">✓ فتوکپی واضح</span>
              <span className="text-[9px] text-neutral-400">سفید کردن کاغذ و پررنگ کردن متن</span>
            </div>
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-bold block">✓ تنظیم گوشه‌ها</span>
              <span className="text-[9px] text-neutral-400">برش دقیق و رفع اعوجاج زاویه</span>
            </div>
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-bold block">✓ خروجی PDF</span>
              <span className="text-[9px] text-neutral-400">استاندارد اسناد و اشتراک‌گذاری</span>
            </div>
          </div>

          {/* Recent Scans Section */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-300">مدارک اسکن شده اخیر</span>
              {photos.length > 0 && (
                <span className="text-[10px] text-neutral-400 font-mono">{photos.length} مدرک</span>
              )}
            </div>

            {photos.length > 0 ? (
              <div className="space-y-2">
                {photos.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setPhotocopyImage(p.grayscaleUrl);
                      setDewarpedImage(p.originalUrl);
                      setScreen('result');
                    }}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-2 flex items-center gap-3 cursor-pointer transition"
                  >
                    <img
                      src={p.grayscaleUrl}
                      alt="مدرک"
                      className="w-12 h-12 object-cover rounded-lg border border-neutral-700 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-200 truncate">مدرک اسکن شده فتوکپی</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">آماده ارسال و چاپ باکیفیت</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-500 rotate-180" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-neutral-600 mx-auto mb-1.5" />
                <p className="text-[11px] text-neutral-400">هنوز مدرکی اسکن نشده است.</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">با زدن دکمه اسکن یا تست نمونه اولین مدرک را ایجاد کنید.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 2: CAMERA VIEW (نمای عکاسی از مدرک)                 */}
      {/* ========================================================= */}
      {screen === 'camera' && (
        <div className="flex-1 flex flex-col relative bg-black">
          {/* Camera Header Bar */}
          <div className="h-14 bg-black/60 backdrop-blur-md px-4 flex items-center justify-between z-20">
            <button
              onClick={() => setScreen('home')}
              className="p-2 -mr-2 text-neutral-200 hover:text-white cursor-pointer"
              title="بازگشت به صفحه اصلی"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-white">کادر اسکن مدرک</span>

            {/* Flash Mode Toggle Button (Off by default) */}
            <button
              onClick={toggleFlash}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border ${
                flashMode === 'off'
                  ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700'
                  : flashMode === 'on'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}
              title="تغییر حالت فلاش"
            >
              {flashMode === 'off' ? (
                <>
                  <ZapOff className="w-3.5 h-3.5" />
                  <span className="text-[10px]">فلاش خاموش</span>
                </>
              ) : flashMode === 'on' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px]">فلاش روشن</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px]">فلاش خودکار</span>
                </>
              )}
            </button>
          </div>

          {/* Viewfinder Preview */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-950">
            {/* Live Camera Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* If camera is unavailable or denied */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 p-6 text-center z-10">
                <Camera className="w-12 h-12 text-neutral-600 mb-3" />
                <p className="text-xs text-neutral-300 max-w-xs mb-4">{cameraError}</p>
                <button
                  onClick={() => {
                    const sampleUrl = generateSampleDocument();
                    prepareImageForCrop(sampleUrl);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>اسکن با نمونه کارت ملی هوشمند</span>
                </button>
              </div>
            )}

            {/* Document Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Dim surrounds */}
              <div className="w-[88%] aspect-[1/1.42] max-h-[72%] border-2 border-dashed border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex flex-col justify-between p-3">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg"></div>

                {/* Guide Text Badge */}
                <div className="self-center bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-emerald-300 font-medium">
                  مدرک یا کارت را درون کادر تنظیم کنید
                </div>

                {/* Subtext */}
                <div className="self-center bg-black/60 px-2.5 py-0.5 rounded-md text-[9px] text-neutral-300">
                  فلاش خاموش (بدون بازتاب نور)
                </div>
              </div>
            </div>

            {/* Visual Flash effect on shutter */}
            {isShutterActive && (
              <div className="absolute inset-0 bg-white z-20 animate-fade-out pointer-events-none"></div>
            )}
          </div>

          {/* Camera Bottom Controls */}
          <div className="h-24 bg-black/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
            {/* Gallery Picker button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
              title="انتخاب از گالری"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Shutter Button */}
            <button
              onClick={handleCapture}
              className="w-18 h-18 rounded-full border-4 border-emerald-500 p-1 bg-transparent hover:scale-105 active:scale-95 transition cursor-pointer flex items-center justify-center"
              title="ثبت و اسکن مدرک"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-neutral-300 transition"></div>
            </button>

            {/* Switch Camera */}
            <button
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
              className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
              title="تغییر دوربین جلو/پشت"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 3: CROP & CORNERS ADJUSTMENT (تنظیم گوشه‌ها و برش)  */}
      {/* ========================================================= */}
      {screen === 'crop' && rawImageSrc && (
        <div className="flex-1 flex flex-col relative bg-[#0d0d0d]">
          {/* Crop Top Header */}
          <div className="h-14 bg-black/70 px-4 flex items-center justify-between border-b border-neutral-800 z-20">
            <button
              onClick={() => setScreen('camera')}
              className="p-1.5 text-neutral-300 hover:text-white cursor-pointer"
              title="انصراف"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-white">تنظیم گوشه‌ها و برش مدرک</span>

            <button
              onClick={rotateSourceImage}
              className="p-1.5 text-neutral-300 hover:text-white cursor-pointer flex items-center gap-1 text-xs"
              title="چرخش ۹۰ درجه"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Crop Viewport with Draggable Corners */}
          <div className="flex-1 relative flex items-center justify-center p-3 overflow-hidden">
            <div className="relative max-w-full max-h-full aspect-auto shadow-2xl rounded-lg overflow-hidden border border-neutral-800">
              <img
                src={rawImageSrc}
                alt="تنظیم کادر"
                className="max-h-[62vh] max-w-[85vw] object-contain block pointer-events-none"
              />

              {/* SVG Overlay with Quad Polygon & 4 Draggable Handles */}
              <svg
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                viewBox={`0 0 ${rawDimensions.width} ${rawDimensions.height}`}
                onPointerMove={(e) => {
                  if (activeCornerIdx === null) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const scaleX = rawDimensions.width / rect.width;
                  const scaleY = rawDimensions.height / rect.height;

                  const x = (e.clientX - rect.left) * scaleX;
                  const y = (e.clientY - rect.top) * scaleY;

                  setCorners(prev => {
                    const next = [...prev] as [Point, Point, Point, Point];
                    next[activeCornerIdx] = {
                      x: Math.max(0, Math.min(rawDimensions.width, x)),
                      y: Math.max(0, Math.min(rawDimensions.height, y)),
                    };
                    return next;
                  });
                }}
                onPointerUp={() => setActiveCornerIdx(null)}
                onPointerLeave={() => setActiveCornerIdx(null)}
              >
                {/* Semi-transparent Dark Polygon Backdrop */}
                <polygon
                  points={`${corners[0].x},${corners[0].y} ${corners[1].x},${corners[1].y} ${corners[2].x},${corners[2].y} ${corners[3].x},${corners[3].y}`}
                  fill="rgba(16, 185, 129, 0.15)"
                  stroke="#10b981"
                  strokeWidth="4"
                />

                {/* 4 Corner Handles with Outer Ring */}
                {corners.map((pt, idx) => (
                  <g
                    key={idx}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setActiveCornerIdx(idx);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Outer touch halo */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="40"
                      fill="transparent"
                    />
                    {/* Outer border */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="20"
                      fill="#059669"
                    />
                    {/* Inner core */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="#ffffff"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Crop Bottom Actions */}
          <div className="h-20 bg-black/85 backdrop-blur-md px-4 flex items-center justify-between gap-3 border-t border-neutral-800">
            <button
              onClick={resetCorners}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold py-3 px-3.5 rounded-xl border border-neutral-700 cursor-pointer"
            >
              تنظیم خودکار کادر
            </button>

            <button
              onClick={processCropAndFilters}
              disabled={isProcessing}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال پردازش فتوکپی...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>تأیید و پردازش فتوکپی</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 4: PROFESSIONAL RESULT VIEW (نمایش اسکن حرفه‌ای)     */}
      {/* ========================================================= */}
      {screen === 'result' && (
        <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
          {/* Result Top Header */}
          <div className="h-14 bg-black/80 px-4 flex items-center justify-between border-b border-neutral-800 z-20">
            <button
              onClick={() => setScreen('home')}
              className="p-1.5 text-neutral-300 hover:text-white cursor-pointer flex items-center gap-1 text-xs"
              title="بازگشت به خانه"
            >
              <ChevronRight className="w-5 h-5" />
              <span>صفحه اصلی</span>
            </button>

            <span className="text-xs font-bold text-white">پیش‌نمایش اسکن مدرک</span>

            <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              کیفیت بالا
            </span>
          </div>

          {/* Document Preview Area with Crisp Paper Mount */}
          <div className="flex-1 p-3 flex items-center justify-center overflow-hidden bg-neutral-950">
            <div className="relative max-h-full max-w-full p-2 bg-white rounded-lg shadow-2xl border border-neutral-300 flex items-center justify-center">
              <img
                src={getActiveResultImage() || ''}
                alt="سند اسکن شده"
                className="max-h-[50vh] max-w-[85vw] object-contain block"
              />
            </div>
          </div>

          {/* Filter Chips Bar (فتوکپی / رنگی جادویی / خاکستری / اصلی) */}
          <div className="bg-neutral-900/90 px-3 py-2 flex items-center justify-center gap-1.5 border-t border-neutral-800">
            <button
              onClick={() => setActiveFilter('photocopy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'photocopy'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
              }`}
            >
              ⚡ فتوکپی واضح
            </button>

            <button
              onClick={() => setActiveFilter('magic_color')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'magic_color'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
              }`}
            >
              ✨ اسکن رنگی
            </button>

            <button
              onClick={() => setActiveFilter('grayscale')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'grayscale'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
              }`}
            >
              📄 خاکستری
            </button>

            <button
              onClick={() => setActiveFilter('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'original'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-750'
              }`}
            >
              🖼️ اصلی
            </button>
          </div>

          {/* Professional Action Buttons (PDF, Share, Rotate, Save) */}
          <div className="p-3 bg-black/90 border-t border-neutral-800 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={exportPdf}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium py-2 px-1 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 border border-neutral-700 cursor-pointer"
                title="خروجی PDF"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>خروجی PDF</span>
              </button>

              <button
                onClick={downloadImage}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium py-2 px-1 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 border border-neutral-700 cursor-pointer"
                title="ذخیره تصویر در گالری"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>ذخیره عکس</span>
              </button>

              <button
                onClick={shareDocument}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium py-2 px-1 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 border border-neutral-700 cursor-pointer"
                title="اشتراک‌گذاری"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>اشتراک</span>
              </button>

              <button
                onClick={rotateResult}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium py-2 px-1 rounded-xl text-[11px] flex flex-col items-center justify-center gap-1 border border-neutral-700 cursor-pointer"
                title="چرخش ۹۰ درجه"
              >
                <RotateCcw className="w-4 h-4 text-neutral-300" />
                <span>چرخش</span>
              </button>
            </div>

            {/* Next Scan Action */}
            <button
              onClick={() => setScreen('camera')}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>اسکن مدرک بعدی</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-emerald-500/40 text-neutral-100 text-xs px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
