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
    descriptionFa: '۲۱۰ × ۲۹۷ میلی‌متر • رایج‌ترین قطع برای مدارک، دادخواست و قراردادها'
  },
  A5: {
    width: 148,
    height: 210,
    nameFa: 'کاغذ A5 (نیم‌برگ)',
    descriptionFa: '۱۴۸ × ۲۱۰ میلی‌متر • مناسب تک‌برگ‌های کوچک، قبض، فاکتور و دفترچه'
  },
  A6: {
    width: 105,
    height: 148,
    nameFa: 'کاغذ A6 (کارت و شناسنامه)',
    descriptionFa: '۱۰۵ × ۱۴۸ میلی‌متر • قطع اختصاصی اسناد هویتی و کارت‌های جیبی'
  },
  B5: {
    width: 176,
    height: 250,
    nameFa: 'کاغذ B5 (قطع کتابی)',
    descriptionFa: '۱۷۶ × ۲۵۰ میلی‌متر • مناسب فرم‌های اداری متوسط و جزوات'
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
 * Renders the document onto a paper canvas matching the selected PrintSettings
 */
export async function renderDocumentToPaperCanvas(
  primaryImgUrl: string,
  secondaryImgUrl: string | undefined,
  settings: PrintSettings
): Promise<HTMLCanvasElement> {
  const primaryImg = await loadImage(primaryImgUrl);
  const secondaryImg = secondaryImgUrl ? await loadImage(secondaryImgUrl) : null;

  const dim = PAPER_DIMENSIONS[settings.pageSize] || PAPER_DIMENSIONS.A4;
  const isLandscape = settings.orientation === 'landscape';

  // Base resolution: ~150 DPI (approx 5.9 pixels per mm)
  const scaleDpi = 5.9;
  const paperWidthMm = isLandscape ? dim.height : dim.width;
  const paperHeightMm = isLandscape ? dim.width : dim.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(paperWidthMm * scaleDpi);
  canvas.height = Math.round(paperHeightMm * scaleDpi);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');

  // Fill crisp white sheet
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border around the paper
  ctx.strokeStyle = '#e2e8f0';
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
    fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, contentW, contentH);
  } else if (settings.layoutMode === '2-in-1') {
    // 2 Documents on Single Sheet (e.g. 2 documents on A4, such as Front + Back of ID card)
    if (isLandscape) {
      // Left and Right split
      const halfW = (contentW - 20) / 2;
      fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, halfW, contentH);

      const secondDoc = secondaryImg || primaryImg;
      fitAndDrawImage(ctx, secondDoc, marginPx + halfW + 20, marginPx, halfW, contentH);

      // Cut/fold guide line
      if (settings.addCutLine) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        const midX = marginPx + halfW + 10;
        ctx.beginPath();
        ctx.moveTo(midX, marginPx);
        ctx.lineTo(midX, marginPx + contentH);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Top and Bottom split (Standard A4 vertical 2-in-1)
      const halfH = (contentH - 30) / 2;
      fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, contentW, halfH);

      const secondDoc = secondaryImg || primaryImg;
      fitAndDrawImage(ctx, secondDoc, marginPx, marginPx + halfH + 30, contentW, halfH);

      // Cut/fold guide line
      if (settings.addCutLine) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        const midY = marginPx + halfH + 15;
        ctx.beginPath();
        ctx.moveTo(marginPx, midY);
        ctx.lineTo(marginPx + contentW, midY);
        ctx.stroke();

        // Little scissors icon or text label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 16px Vazirmatn, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✂ خط راهنمای تا و برش', canvas.width / 2, midY - 6);
        ctx.restore();
      }
    }
  } else if (settings.layoutMode === '4-in-1') {
    // 4 documents grid (2x2)
    const colW = (contentW - 20) / 2;
    const rowH = (contentH - 20) / 2;

    const imgToUse = secondaryImg || primaryImg;
    fitAndDrawImage(ctx, primaryImg, marginPx, marginPx, colW, rowH);
    fitAndDrawImage(ctx, imgToUse, marginPx + colW + 20, marginPx, colW, rowH);
    fitAndDrawImage(ctx, primaryImg, marginPx, marginPx + rowH + 20, colW, rowH);
    fitAndDrawImage(ctx, imgToUse, marginPx + colW + 20, marginPx + rowH + 20, colW, rowH);

    if (settings.addCutLine) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      // Vertical divider
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, marginPx);
      ctx.lineTo(canvas.width / 2, canvas.height - marginPx);
      ctx.stroke();
      // Horizontal divider
      ctx.beginPath();
      ctx.moveTo(marginPx, canvas.height / 2);
      ctx.lineTo(canvas.width - marginPx, canvas.height / 2);
      ctx.stroke();
      ctx.restore();
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
    ctx.fillText(`نسخه فتوکپی اسکن شده • قطع ${dim.nameFa.split(' ')[1]} • ${dateStr}`, marginPx, canvas.height - 12);
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
 * Exports directly to a real standard PDF file (A4, A5, A6) using jsPDF
 */
export async function exportToStandardPdf(
  primaryImgUrl: string,
  secondaryImgUrl: string | undefined,
  settings: PrintSettings
): Promise<Blob> {
  const canvas = await renderDocumentToPaperCanvas(primaryImgUrl, secondaryImgUrl, settings);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const dim = PAPER_DIMENSIONS[settings.pageSize] || PAPER_DIMENSIONS.A4;
  const isLandscape = settings.orientation === 'landscape';

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [dim.width, dim.height]
  });

  const pdfW = isLandscape ? dim.height : dim.width;
  const pdfH = isLandscape ? dim.width : dim.height;

  doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
  return doc.output('blob');
}
