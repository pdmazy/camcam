/**
 * Edge Detection and Corner Identification for Documents and ID Cards
 * Detects the 4 extremal corners [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 * of a document photographed against a background.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Automatically detects the four corners of a document in an image.
 * Uses downscaled Sobel edge magnitude and quadrilateral extremal contour finding.
 */
export function detectDocumentCorners(
  img: HTMLImageElement,
  fallbackMarginPercent: number = 0.06
): [Point, Point, Point, Point] {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  if (!origW || !origH) {
    return [
      { x: 20, y: 20 },
      { x: 300, y: 20 },
      { x: 300, y: 400 },
      { x: 20, y: 400 }
    ];
  }

  // Downscale for fast & noise-free processing (target max 320px)
  const maxDim = 320;
  const scale = Math.min(maxDim / origW, maxDim / origH, 1.0);
  const w = Math.max(10, Math.round(origW * scale));
  const h = Math.max(10, Math.round(origH * scale));

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No canvas context');

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 2. Simple 3x3 Gaussian Blur to remove sensor noise
    const blurred = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        blurred[idx] =
          (gray[idx - w - 1] + 2 * gray[idx - w] + gray[idx - w + 1] +
           2 * gray[idx - 1] + 4 * gray[idx] + 2 * gray[idx + 1] +
           gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1]) / 16;
      }
    }

    // 3. Sobel Gradient Magnitude
    const mag = new Float32Array(w * h);
    let sumMag = 0;
    let edgeCount = 0;

    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const idx = y * w + x;
        // Sobel X
        const gx =
          -1 * blurred[idx - w - 1] + 1 * blurred[idx - w + 1] +
          -2 * blurred[idx - 1]     + 2 * blurred[idx + 1] +
          -1 * blurred[idx + w - 1] + 1 * blurred[idx + w + 1];

        // Sobel Y
        const gy =
          -1 * blurred[idx - w - 1] - 2 * blurred[idx - w] - 1 * blurred[idx - w + 1] +
           1 * blurred[idx + w - 1] + 2 * blurred[idx + w] + 1 * blurred[idx + w + 1];

        const val = Math.sqrt(gx * gx + gy * gy);
        mag[idx] = val;
        sumMag += val;
        edgeCount++;
      }
    }

    const meanMag = edgeCount > 0 ? sumMag / edgeCount : 30;
    // Adaptive threshold: only strong edges (document boundaries)
    const threshold = Math.max(35, meanMag * 1.8);

    // 4. Collect coordinates of strong edge points
    let minSum = Infinity;   // Top-Left (min x + y)
    let maxSum = -Infinity;  // Bottom-Right (max x + y)
    let minDiff = Infinity;  // Bottom-Left (min x - y)
    let maxDiff = -Infinity; // Top-Right (max x - y)

    let tl = { x: w * 0.08, y: h * 0.08 };
    let tr = { x: w * 0.92, y: h * 0.08 };
    let br = { x: w * 0.92, y: h * 0.92 };
    let bl = { x: w * 0.08, y: h * 0.92 };

    let foundPoints = 0;
    // Ignore extreme border margins (first 4% and last 4%) to avoid device bezel / preview artifacts
    const borderX = Math.round(w * 0.04);
    const borderY = Math.round(h * 0.04);

    for (let y = borderY; y < h - borderY; y++) {
      for (let x = borderX; x < w - borderX; x++) {
        const idx = y * w + x;
        if (mag[idx] > threshold) {
          foundPoints++;
          const sum = x + y;
          const diff = x - y;

          if (sum < minSum) {
            minSum = sum;
            tl = { x, y };
          }
          if (sum > maxSum) {
            maxSum = sum;
            br = { x, y };
          }
          if (diff > maxDiff) {
            maxDiff = diff;
            tr = { x, y };
          }
          if (diff < minDiff) {
            minDiff = diff;
            bl = { x, y };
          }
        }
      }
    }

    // 5. Sanity check: Ensure the detected quadrilateral has sufficient width & height
    const detWidth = Math.max(Math.abs(tr.x - tl.x), Math.abs(br.x - bl.x));
    const detHeight = Math.max(Math.abs(bl.y - tl.y), Math.abs(br.y - tr.y));

    if (foundPoints > 20 && detWidth > w * 0.35 && detHeight > h * 0.35) {
      // Scale coordinates back to original image dimensions
      const invScale = 1 / scale;
      return [
        { x: Math.round(tl.x * invScale), y: Math.round(tl.y * invScale) },
        { x: Math.round(tr.x * invScale), y: Math.round(tr.y * invScale) },
        { x: Math.round(br.x * invScale), y: Math.round(br.y * invScale) },
        { x: Math.round(bl.x * invScale), y: Math.round(bl.y * invScale) }
      ];
    }
  } catch (err) {
    console.warn('Edge detection error, using fallback inset:', err);
  }

  // Fallback: Centered inset rectangle
  const insetX = origW * fallbackMarginPercent;
  const insetY = origH * fallbackMarginPercent;
  return [
    { x: Math.round(insetX), y: Math.round(insetY) },
    { x: Math.round(origW - insetX), y: Math.round(insetY) },
    { x: Math.round(origW - insetX), y: Math.round(origH - insetY) },
    { x: Math.round(insetX), y: Math.round(origH - insetY) }
  ];
}
