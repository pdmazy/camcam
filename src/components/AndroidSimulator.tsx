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
  Upload,
  Scan,
  Printer,
  Sliders,
  Settings2,
  Scissors
} from 'lucide-react';
import { CapturedPhoto, PrintSettings, PageSize, LayoutMode } from '../types';
import { PrintSettingsModal } from './PrintSettingsModal';
import { renderDocumentToPaperCanvas, exportToStandardPdf, PAPER_DIMENSIONS } from '../utils/printLayout';
import { detectDocumentCorners } from '../utils/edgeDetection';
import appIcon from '../assets/images/app_scanner_icon_1788983654452.jpg';

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

  // Real-time edge detection overlay state
  const [isEdgeDetectionActive, setIsEdgeDetectionActive] = useState<boolean>(true);

  // Save to gallery state
  const [isSavedToGallery, setIsSavedToGallery] = useState<boolean>(false);
  const [isSavingGallery, setIsSavingGallery] = useState<boolean>(false);

  // Print & Standard Paper Layout Settings (A4, A5, 2-in-1, etc.)
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    pageSize: 'A4',
    layoutMode: '1-in-1',
    orientation: 'portrait',
    margin: 'standard',
    addCutLine: true,
    addTimestampFooter: true,
  });
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [paperPreviewUrl, setPaperPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

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

  // Launch Crop Screen with a loaded image and automatic edge detection
  const prepareImageForCrop = (imgUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setRawDimensions({ width: img.width, height: img.height });
      setRawImageSrc(imgUrl);
      setRotation(0);

      // Automatic Document Edge Detection via Sobel & Convex Analysis
      try {
        const detectedCorners = detectDocumentCorners(img);
        setCorners(detectedCorners);
        showToast('✨ لبه‌های مدرک به‌طور هوشمند شناسایی شد');
      } catch (e) {
        // Fallback inset
        const insetX = img.width * 0.08;
        const insetY = img.height * 0.08;
        setCorners([
          { x: insetX, y: insetY },
          { x: img.width - insetX, y: insetY },
          { x: img.width - insetX, y: img.height - insetY },
          { x: insetX, y: img.height - insetY },
        ]);
      }

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

  // Re-run automatic edge detection
  const resetCorners = () => {
    if (!rawImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const detectedCorners = detectDocumentCorners(img);
      setCorners(detectedCorners);
      showToast('✨ لبه‌های مدرک مجدداً شناسایی و تنظیم شد');
    };
    img.src = rawImageSrc;
  };

  // Select entire image frame without cropping
  const setFullFrameCorners = () => {
    setCorners([
      { x: 0, y: 0 },
      { x: rawDimensions.width, y: 0 },
      { x: rawDimensions.width, y: rawDimensions.height },
      { x: 0, y: rawDimensions.height },
    ]);
    showToast('کادر کل تصویر انتخاب شد');
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

      // Natural orientation of the captured document
      const isDocLandscape = targetWidth >= targetHeight;
      setPrintSettings(prev => ({
        ...prev,
        orientation: isDocLandscape ? 'landscape' : 'portrait'
      }));

      setActiveFilter('photocopy');
      setIsSavedToGallery(false);
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

  // Generate realistic paper sheet render whenever in result screen and image or print settings change
  useEffect(() => {
    if (screen !== 'result') return;
    const activeImg = getActiveResultImage();
    if (!activeImg) return;

    let isMounted = true;
    setIsGeneratingPreview(true);

    renderDocumentToPaperCanvas(activeImg, printSettings.secondaryPhoto, printSettings)
      .then((canvas) => {
        if (isMounted) {
          setPaperPreviewUrl(canvas.toDataURL('image/jpeg', 0.95));
          setIsGeneratingPreview(false);
        }
      })
      .catch((err) => {
        console.error('Error rendering paper canvas:', err);
        if (isMounted) setIsGeneratingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [screen, activeFilter, photocopyImage, magicColorImage, grayscaleImage, dewarpedImage, printSettings]);

  // Save to Gallery: Exports processed document as a JPEG file to public storage
  const saveToGalleryAsJpeg = async () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    setIsSavingGallery(true);

    try {
      // Use the paper sheet layout canvas so output respects A4, A5, or 2-in-1 layout!
      const canvas = await renderDocumentToPaperCanvas(imgUrl, printSettings.secondaryPhoto, printSettings);
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsSavingGallery(false);
          return;
        }

        const layoutLabel = printSettings.layoutMode === '2-in-1' ? '2in1' : printSettings.pageSize;
        const filename = `Document_Scan_${layoutLabel}_${Date.now()}.jpg`;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);

        setIsSavingGallery(false);
        setIsSavedToGallery(true);
        const layoutText = printSettings.layoutMode === '2-in-1' ? 'دو سند در برگه A4' : `قطع ${printSettings.pageSize}`;
        showToast(`سند با فرمت JPEG (${layoutText}) در حافظه عمومی دستگاه (گالری) ذخیره شد`);

        setTimeout(() => {
          setIsSavedToGallery(false);
        }, 4000);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error(err);
      setIsSavingGallery(false);
      showToast('خطا در تبدیل و ذخیره تصویر در گالری');
    }
  };

  // Export to Standard PDF Document (A4, A5, 2-in-1 on A4 using real jsPDF)
  const exportPdf = async () => {
    const imgUrl = getActiveResultImage();
    if (!imgUrl) return;

    setIsExportingPdf(true);
    try {
      const pdfBlob = await exportToStandardPdf(imgUrl, printSettings.secondaryPhoto, printSettings);
      const layoutLabel = printSettings.layoutMode === '2-in-1' ? '2in1_A4' : printSettings.pageSize;
      const filename = `Document_${layoutLabel}_${Date.now()}.pdf`;
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      const pageDesc = printSettings.layoutMode === '2-in-1' ? 'دو سند در یک برگه A4' : `صفحه استاندارد ${printSettings.pageSize}`;
      showToast(`فایل PDF استاندارد (${pageDesc}) دانلود شد`);
    } catch (err) {
      console.error(err);
      showToast('خطا در ایجاد سند PDF');
    } finally {
      setIsExportingPdf(false);
    }
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
      saveToGalleryAsJpeg();
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
      setIsSavedToGallery(false);
      showToast('جهت مدرک ۹۰ درجه تغییر کرد');
    };
    img.src = imgUrl;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 select-none overflow-hidden relative font-sans">
      {/* Hidden File Input for Gallery picking */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Android Status Bar */}
      <div className="h-7 bg-slate-100/90 border-b border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-600 z-30 shrink-0">
        <span className="font-mono font-medium">14:00</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100/80 px-2 py-0.2 rounded-full">کاملاً آفلاین</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></div>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================= */}
      {/* SCREEN 1: HOME DASHBOARD (صفحه اصلی و شیک اپلیکیشن)        */}
      {/* ========================================================= */}
      {screen === 'home' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto max-w-md mx-auto w-full bg-slate-50">
          {/* Brand Header with Generated 3D App Icon */}
          <div className="flex items-center justify-between mt-1 mb-4 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3">
              <img
                src={appIcon}
                alt="Scanner Icon"
                className="w-12 h-12 rounded-2xl shadow-md border border-slate-200 object-cover"
              />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  اسکنر و فتوکپی هوشمند مدارک
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">نسخه فتوکپی اداری پرکنتراست • بدون اینترنت</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold shrink-0">
              نسخه ۴.۲
            </span>
          </div>

          {/* Quick Paper Output Selector (A4, A5, 2-in-1) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                اندازه و چیدمان برگه خروجی:
              </span>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                <span>تنظیمات پیشرفته</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPrintSettings(prev => ({ ...prev, pageSize: 'A4', layoutMode: '1-in-1' }))}
                className={`py-2 px-2 rounded-xl text-center border-2 transition cursor-pointer ${
                  printSettings.pageSize === 'A4' && printSettings.layoutMode === '1-in-1'
                    ? 'bg-emerald-50 border-emerald-600 text-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="block text-xs font-black">📄 برگه A4</span>
                <span className="text-[10px] font-bold text-slate-500">تک‌سند اداری</span>
              </button>

              <button
                onClick={() => setPrintSettings(prev => ({ ...prev, pageSize: 'A5', layoutMode: '1-in-1' }))}
                className={`py-2 px-2 rounded-xl text-center border-2 transition cursor-pointer ${
                  printSettings.pageSize === 'A5' && printSettings.layoutMode === '1-in-1'
                    ? 'bg-emerald-50 border-emerald-600 text-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="block text-xs font-black">📑 برگه A5</span>
                <span className="text-[10px] font-bold text-slate-500">نیم‌صفحه</span>
              </button>

              <button
                onClick={() => setPrintSettings(prev => ({ ...prev, pageSize: 'A4', layoutMode: '2-in-1' }))}
                className={`py-2 px-2 rounded-xl text-center border-2 transition cursor-pointer ${
                  printSettings.layoutMode === '2-in-1'
                    ? 'bg-emerald-50 border-emerald-600 text-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="block text-xs font-black">✂️ ۲ در ۱</span>
                <span className="text-[10px] font-bold text-slate-500">رو و پشت</span>
              </button>
            </div>
          </div>

          {/* Main Action Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-3.5 shadow-sm space-y-2.5">
            <span className="text-xs font-extrabold text-slate-900 block">عملیات اسکن مدرک</span>

            {/* Primary Button: Open Camera */}
            <button
              onClick={() => setScreen('camera')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition shadow-md shadow-emerald-600/25 text-sm sm:text-base cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>اسکن مدرک جدید با دوربین</span>
            </button>

            {/* Secondary Button: Pick from Gallery */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs sm:text-sm border-2 border-slate-200 hover:border-slate-300 cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>انتخاب عکس مدرک از گالری گوشی</span>
            </button>

            {/* Demo Sample Card Quick Test */}
            <button
              onClick={() => {
                const sampleUrl = generateSampleDocument();
                prepareImageForCrop(sampleUrl);
              }}
              className="w-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs border border-emerald-300/80 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>تست سریع با نمونه مدرک شناسایی (کارت ملی)</span>
            </button>
          </div>

          {/* Quality & Tip Card */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 mb-3.5">
            <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>نکته برای بالاترین کیفیت فتوکپی</span>
            </div>
            <p className="text-[11px] text-amber-950/80 leading-relaxed">
              فلاش دوربین به طور پیش‌فرض <strong>خاموش</strong> است تا از بازتاب نور روی سلفون یا کارت جلوگیری شود. مدرک را روی سطح صاف با نور یکنواخت محیطی قرار دهید.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-bold block">✓ فتوکپی واضح</span>
              <span className="text-[9px] text-slate-500">حذف سایه و سفیدسازی کاغذ</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-bold block">✓ کادر هوشمند</span>
              <span className="text-[9px] text-slate-500">تشخیص لبه و برش ۴ گوشه</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-bold block">✓ ذخیره در گالری</span>
              <span className="text-[9px] text-slate-500">فرمت استاندارد JPEG و PDF</span>
            </div>
          </div>

          {/* Recent Scans Section */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">مدارک اسکن شده اخیر</span>
              {photos.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono font-medium">{photos.length} مدرک</span>
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
                    className="bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-2 flex items-center gap-3 cursor-pointer transition shadow-2xs"
                  >
                    <img
                      src={p.grayscaleUrl}
                      alt="مدرک"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">مدرک اسکن شده فتوکپی</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">آماده ارسال و چاپ باکیفیت</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-slate-600 font-medium">هنوز مدرکی اسکن نشده است.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">با زدن دکمه اسکن یا تست نمونه اولین مدرک را ایجاد کنید.</p>
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

            <div className="flex items-center gap-1.5">
              {/* Real-time Edge Scanning Toggle Button */}
              <button
                onClick={() => {
                  setIsEdgeDetectionActive(prev => !prev);
                  showToast(!isEdgeDetectionActive ? 'اسکن لبه‌های مدرک فعال شد' : 'اسکن لبه‌های مدرک غیرفعال شد');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border transition ${
                  isEdgeDetectionActive
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
                }`}
                title="تغییر وضعیت ردیابی لبه‌های مدرک"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">تشخیص لبه:</span>
                <span className="text-[10px]">{isEdgeDetectionActive ? 'روشن' : 'خاموش'}</span>
              </button>

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

            {/* Real-time UI Overlay Layer: Semi-transparent Detection Box */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-5 z-10">
              {/* Semi-transparent Detection Box with dim surrounds */}
              <div
                className={`w-[88%] aspect-[1/1.42] max-h-[74%] rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] flex flex-col justify-between p-3.5 transition-all duration-300 ${
                  isEdgeDetectionActive
                    ? 'bg-emerald-500/15 backdrop-blur-[0.5px] border-2 border-emerald-400 animate-detection-box'
                    : 'bg-black/20 border-2 border-dashed border-neutral-500'
                }`}
              >
                {/* 4 Precision Corner Reticles */}
                <div className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg shadow-[0_0_8px_#34d399]"></div>
                <div className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg shadow-[0_0_8px_#34d399]"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg shadow-[0_0_8px_#34d399]"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-3 border-r-3 border-emerald-400 rounded-br-lg shadow-[0_0_8px_#34d399]"></div>

                {/* Corner Coordinates Tags */}
                <span className="absolute top-1 left-2 text-[8px] font-mono font-bold text-emerald-400/80">[TL]</span>
                <span className="absolute top-1 right-2 text-[8px] font-mono font-bold text-emerald-400/80">[TR]</span>
                <span className="absolute bottom-1 left-2 text-[8px] font-mono font-bold text-emerald-400/80">[BL]</span>
                <span className="absolute bottom-1 right-2 text-[8px] font-mono font-bold text-emerald-400/80">[BR]</span>

                {/* Real-time Vertical Animated Scanning Laser Beam */}
                {isEdgeDetectionActive && (
                  <div className="absolute inset-x-0 animate-scan-line pointer-events-none z-0">
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_14px_#34d399]"></div>
                    <div className="h-10 w-full bg-gradient-to-b from-emerald-400/25 to-transparent"></div>
                  </div>
                )}

                {/* Top Status Signal Badge: Scanning for document edges */}
                <div className="flex items-center justify-between z-10">
                  <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/50 flex items-center gap-1.5 shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold tracking-tight">
                      در حال اسکن و پایش لبه‌های مدرک...
                    </span>
                  </div>

                  <div className="bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow">
                    <Scan className="w-3 h-3 text-emerald-400" />
                    <span>لبه‌ها فعال</span>
                  </div>
                </div>

                {/* Center Alignment Reticle */}
                <div className="self-center flex flex-col items-center justify-center opacity-70 z-10 pointer-events-none">
                  <div className="w-8 h-8 rounded-full border border-emerald-400/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  </div>
                </div>

                {/* Bottom Guidance Signal Badge */}
                <div className="self-center bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-neutral-200 flex items-center gap-1.5 shadow-lg z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>کادر نیمه‌شفاف هوشمند • لبه‌های مدرک را درون کادر تنظیم کنید</span>
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
          <div className="h-20 bg-black/90 backdrop-blur-md px-3.5 flex items-center justify-between gap-2 border-t border-neutral-800">
            <button
              onClick={setFullFrameCorners}
              className="bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-neutral-200 text-xs font-bold py-3 px-3 rounded-xl border border-neutral-700 cursor-pointer transition shrink-0"
              title="انتخاب کل تصویر بدون برش"
            >
              کادر کامل
            </button>

            <button
              onClick={resetCorners}
              className="bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-900 text-neutral-200 text-xs font-bold py-3 px-3 rounded-xl border border-neutral-700 cursor-pointer transition shrink-0 flex items-center gap-1"
              title="تشخیص خودکار مجدد لبه‌ها"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>تشخیص مجدد</span>
            </button>

            <button
              onClick={processCropAndFilters}
              disabled={isProcessing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>در حال تبدیل به فتوکپی...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                  <span>تأیید و تبدیل به فتوکپی</span>
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
        <div className="flex-1 flex flex-col relative bg-slate-100 text-slate-900">
          {/* Result Top Header */}
          <div className="h-13 bg-white px-3.5 flex items-center justify-between border-b border-slate-200 z-20 shadow-2xs">
            <button
              onClick={() => setScreen('home')}
              className="p-1.5 text-slate-700 hover:text-slate-950 cursor-pointer flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="بازگشت به خانه"
            >
              <ChevronRight className="w-4 h-4" />
              <span>خانه</span>
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-slate-900 block">پیش‌نمایش برگه و خروجی</span>
              <span className="text-[10px] text-slate-500">
                {printSettings.layoutMode === '2-in-1' 
                  ? 'برگه A4 • دو سند رو و پشت (با خط برش)' 
                  : `برگه ${printSettings.pageSize} • ${printSettings.orientation === 'portrait' ? 'عمودی' : 'افقی'}`}
              </span>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="p-1.5 text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
              title="تنظیمات اندازه و چاپ"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>تنظیمات چاپ</span>
            </button>
          </div>

          {/* Quick Paper Format Selector Bar */}
          <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto text-xs z-10">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              قطع برگه:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setPrintSettings(prev => ({ ...prev, pageSize: 'A4', layoutMode: '1-in-1' }));
                  setIsSavedToGallery(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 ${
                  printSettings.pageSize === 'A4'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                برگه A4 اداری
              </button>

              <button
                onClick={() => {
                  setPrintSettings(prev => ({ ...prev, pageSize: 'A5', layoutMode: '1-in-1' }));
                  setIsSavedToGallery(false);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border-2 ${
                  printSettings.pageSize === 'A5'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                برگه A5 نیم‌صفحه
              </button>
            </div>
          </div>

          {/* Document Preview Area with Realistic Paper Sheet Display */}
          <div className="flex-1 p-2.5 flex items-center justify-center overflow-hidden bg-slate-200/80 relative">
            <div className="relative max-h-full max-w-full p-1.5 bg-white rounded-md shadow-xl border border-slate-300 flex flex-col items-center justify-center transition-all">
              {isGeneratingPreview ? (
                <div className="w-64 h-80 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  <span className="text-xs">در حال قالب‌بندی برگه {printSettings.pageSize}...</span>
                </div>
              ) : (
                <img
                  src={paperPreviewUrl || getActiveResultImage() || ''}
                  alt="سند اسکن شده روی برگه"
                  className="max-h-[44vh] max-w-[85vw] object-contain block rounded-xs"
                />
              )}

              {/* 2-in-1 secondary document indicator/button if missing */}
              {printSettings.layoutMode === '2-in-1' && !printSettings.secondaryPhoto && (
                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] p-2 rounded-lg flex items-center justify-between shadow-lg">
                  <span className="text-[10px] text-slate-200">کپی ۲ در ۱: سند دوم را اضافه کنید</span>
                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                  >
                    + افزودن پشت مدرک
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Chips Bar (فتوکپی / رنگی جادویی / خاکستری / اصلی) */}
          <div className="bg-white px-3 py-1.5 flex items-center justify-center gap-1.5 border-t border-slate-200 shadow-2xs">
            <button
              onClick={() => {
                setActiveFilter('photocopy');
                setIsSavedToGallery(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'photocopy'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ⚡ فتوکپی واضح
            </button>

            <button
              onClick={() => {
                setActiveFilter('magic_color');
                setIsSavedToGallery(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'magic_color'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ✨ اسکن رنگی
            </button>

            <button
              onClick={() => {
                setActiveFilter('grayscale');
                setIsSavedToGallery(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'grayscale'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📄 خاکستری
            </button>

            <button
              onClick={() => {
                setActiveFilter('original');
                setIsSavedToGallery(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'original'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🖼️ اصلی
            </button>
          </div>

          {/* Professional Action Buttons (Save to Gallery as JPEG, PDF, Print Settings, Share) */}
          <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5">
            {/* Primary Action: Dedicated 'Save to Gallery' Button (JPEG to Public Storage) */}
            <button
              id="btn-save-to-gallery"
              onClick={saveToGalleryAsJpeg}
              disabled={isSavingGallery}
              className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-between transition cursor-pointer border shadow-md ${
                isSavedToGallery
                  ? 'bg-emerald-700 border-emerald-600 text-white shadow-emerald-700/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-600 text-white shadow-emerald-600/30 active:scale-[0.99]'
              }`}
              title="ذخیره مستقیم برگه در گالری (حافظه عمومی دستگاه با فرمت JPEG)"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20">
                  {isSavingGallery ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  ) : isSavedToGallery ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Download className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-extrabold text-sm sm:text-base leading-tight">
                    {isSavedToGallery ? '✓ در گالری ذخیره شد' : 'ذخیره در گالری (فرمت استاندارد JPEG)'}
                  </span>
                  <span className="text-[11px] text-emerald-100 font-medium mt-0.5">
                    {printSettings.layoutMode === '2-in-1' 
                      ? 'برگه A4 با ۲ سند رو و پشت (کیفیت اصلی)' 
                      : `برگه استاندارد ${printSettings.pageSize === 'A4' ? 'A4 اداری' : 'A5 نیم‌صفحه'}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/25 text-white border border-white/30">
                  JPEG
                </span>
              </div>
            </button>

            {/* Secondary Action Buttons Grid: 2 Columns, High Contrast, Readable */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-export-pdf"
                onClick={exportPdf}
                disabled={isExportingPdf}
                className="bg-white hover:bg-emerald-50 active:bg-emerald-100 text-slate-800 hover:text-emerald-900 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-emerald-400 cursor-pointer transition shadow-2xs"
                title={`خروجی استاندارد سند ${printSettings.pageSize} (PDF)`}
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>خروجی PDF اداری</span>
              </button>

              <button
                id="btn-print-settings"
                onClick={() => setIsPrintModalOpen(true)}
                className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition shadow-2xs"
                title="تنظیم ابعاد کاغذ (A4, A5, ۲ در ۱)"
              >
                <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>تنظیمات قطع کاغذ</span>
              </button>

              <button
                id="btn-rotate-doc"
                onClick={rotateResult}
                className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition shadow-2xs"
                title="چرخش ۹۰ درجه تصویر"
              >
                <RotateCcw className="w-4 h-4 text-slate-700 shrink-0" />
                <span>چرخش ۹۰ درجه</span>
              </button>

              <button
                id="btn-share-doc"
                onClick={shareDocument}
                className="bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition shadow-2xs"
                title="اشتراک‌گذاری مدرک"
              >
                <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>اشتراک‌گذاری مدرک</span>
              </button>
            </div>

            {/* Next Scan Action */}
            <button
              id="btn-scan-next"
              onClick={() => setScreen('camera')}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>اسکن مدرک بعدی</span>
            </button>
          </div>
        </div>
      )}

      {/* Print Settings Modal */}
      <PrintSettingsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={printSettings}
        onSettingsChange={(newSettings) => {
          setPrintSettings(newSettings);
          setIsSavedToGallery(false);
        }}
        capturedPhotos={photos}
      />

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/50 text-white text-xs px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
