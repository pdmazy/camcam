import { jsPDF } from 'jspdf';
import { PrintSettings, PageSize } from '../types';

export interface PaperDimensionMm {
  width: number;
  height: number;
  nameFa: string;
  descriptionFa: string;
}

export const PAPER_DIMENSIONS: Record<PageSize, PaperDimensionMm> = {
  A4: {
    width: 210,
    height: 297,
    nameFa: 'کاغذ A4 (استاندارد اداری)',
    descriptionFa: '۲۱۰ × ۲۹۷ میلی‌متر • مناسب تمامی مدارک اداری، دادخواست و نامه‌ها'
  },
  A5: {
    width: 148,
    height: 210,
    nameFa: 'کاغذ A5 (نیم‌صفحه)',
    descriptionFa: '۱۴۸ × ۲۱۰ میلی‌متر • مناسب اسناد، کارت‌ها، فاکتور، قبض و شناسنامه'
  }
};

/**
 * Loads an image from dataURL or URL and returns an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Renders the document onto a paper canvas matching the selected PrintSettings.
 * Automatically respects the captured document's aspect ratio and orientation (landscape vs portrait).
 */
export async function renderDocumentToPaperCanvas(
  primaryImgUrl: string,
  secondaryImgUrl: string | undefined,
  settings: PrintSettings
): Promise<HTMLCanvasElement> {
  const primaryImg = await loadImage(primaryImgUrl);
  const secondaryImg = secondaryImgUrl ? await loadImage(secondaryImgUrl) : null;

  const dim = PAPER_DIMENSIONS[settings.pageSize] || PAPER_DIMENSIONS.A4;
  
  // Determine natural orientation of document
  const isDocLandscape = primaryImg.naturalWidth > primaryImg.naturalHeight;

  // In 1-in-1 single document mode: sheet matches document's natural orientation directly!
  // If doc is landscape, sheet is landscape (e.g. A5: 210x148, A4: 297x210).
  // If doc is portrait, sheet is portrait (e.g. A5: 148x210, A4: 210x297).
  // In 2-in-1 mode: A4 portrait is standard for stacking 2 horizontal ID cards (front & back).
  let isSheetLandscape: boolean;
  if (settings.layoutMode === '2-in-1') {
    isSheetLandscape = settings.orientation === 'landscape';
  } else {
    // 1-in-1 mode: strictly match document orientation unless explicit user override
    isSheetLandscape = isDocLandscape;
  }

  // Base resolution: ~150 DPI (approx 5.9 pixels per mm)
  const scaleDpi = 5.9;
  const paperWidthMm = isSheetLandscape
    ? Math.max(dim.width, dim.height)
    : Math.min(dim.width, dim.height);
  const paperHeightMm = isSheetLandscape
    ? Math.min(dim.width, dim.height)
    : Math.max(dim.width, dim.height);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(paperWidthMm * scaleDpi);
  canvas.height = Math.round(paperHeightMm * scaleDpi);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');

  // Fill crisp pure white administrative paper sheet
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border around the paper
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  // Margin in pixels
  let marginPx = 48; // standard ~8mm
  if (settings.margin === 'compact') marginPx = 24; // ~4mm
  if (settings.margin === 'none') marginPx = 0;

  const contentW = canvas.width - marginPx * 2;
  const contentH = canvas.height - marginPx * 2;

  if (settings.layoutMode === '1-in-1') {
    // 1 Document centered on page (e.g. Single A4 or Single A5)
    // Document maintains its natural aspect ratio without distortion or rotation
    fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, contentW, contentH);
  } else if (settings.layoutMode === '2-in-1') {
    // 2 Documents on Single Sheet (e.g. 2 documents on A4, such as Front + Back of ID card)
    if (isSheetLandscape) {
      // Left and Right split
      const halfW = (contentW - 24) / 2;
      fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, halfW, contentH);

      const secondDoc = secondaryImg || primaryImg;
      fitAndDrawImage(ctx, secondDoc, marginPx + halfW + 24, marginPx, halfW, contentH);

      // Cut/fold guide line
      if (settings.addCutLine) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        const midX = marginPx + halfW + 12;
        ctx.beginPath();
        ctx.moveTo(midX, marginPx);
        ctx.lineTo(midX, marginPx + contentH);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Top and Bottom split (Standard Iranian A4 vertical 2-in-1 for ID Cards)
      const halfH = (contentH - 36) / 2;
      fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, contentW, halfH);

      const secondDoc = secondaryImg || primaryImg;
      fitAndDrawImage(ctx, secondDoc, marginPx, marginPx + halfH + 36, contentW, halfH);

      // Cut/fold guide line
      if (settings.addCutLine) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        const midY = marginPx + halfH + 18;
        ctx.beginPath();
        ctx.moveTo(marginPx, midY);
        ctx.lineTo(marginPx + contentW, midY);
        ctx.stroke();

        // Little scissors icon with clean Persian label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 15px Vazirmatn, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✂ خط راهنمای تا و برش اداری', canvas.width / 2, midY - 8);
        ctx.restore();
      }
    }
  }

  // Footer metadata
  if (settings.addTimestampFooter) {
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.textAlign = 'left';
    const now = new Date();
    const dateStr = now.toLocaleDateString('fa-IR') + ' - ' + now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const sizeTitle = settings.pageSize === 'A4' ? 'A4 اداری' : 'A5 نیم‌صفحه';
    ctx.fillText(`نسخه فتوکپی اسکن شده • قطع ${sizeTitle} • ${dateStr}`, marginPx, canvas.height - 12);
    ctx.restore();
  }

  return canvas;
}

/**
 * Fits and centers an image within the specified target bounding box
 */
function fitAndDrawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const destW = img.naturalWidth * scale;
  const destH = img.naturalHeight * scale;
  const destX = x + (maxW - destW) / 2;
  const destY = y + (maxH - destH) / 2;

  ctx.drawImage(img, destX, destY, destW, destH);
}

/**
 * Exports directly to a real standard PDF file (A4 or A5) using jsPDF
 */
export async function exportToStandardPdf(
  primaryImgUrl: string,
  secondaryImgUrl: string | undefined,
  settings: PrintSettings
): Promise<Blob> {
  const canvas = await renderDocumentToPaperCanvas(primaryImgUrl, secondaryImgUrl, settings);
  const imgData = canvas.toDataURL('image/jpeg', 0.96);

  const dim = PAPER_DIMENSIONS[settings.pageSize] || PAPER_DIMENSIONS.A4;
  const isSheetLandscape = canvas.width > canvas.height;

  const pdfW = isSheetLandscape ? Math.max(dim.width, dim.height) : Math.min(dim.width, dim.height);
  const pdfH = isSheetLandscape ? Math.min(dim.width, dim.height) : Math.max(dim.width, dim.height);

  const doc = new jsPDF({
    orientation: isSheetLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfW, pdfH]
  });

  doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
  return doc.output('blob');
}
