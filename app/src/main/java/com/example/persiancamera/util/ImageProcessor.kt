package com.example.persiancamera.util

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import kotlin.math.hypot
import kotlin.math.max

object ImageProcessor {

    /**
     * Smart High-Contrast Photocopy Filter (فتوکپی کنتراست بالا)
     * Cleans up dark shadows, bleaches the paper background to crisp white,
     * and enhances contrast of typed text, handwritten signatures, and official stamps.
     */
    fun toPhotocopy(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // 1. Convert to Grayscale
        val grayMatrix = ColorMatrix().apply { setSaturation(0f) }

        // 2. High Contrast S-Curve + Whitening
        val contrast = 2.2f
        val brightnessOffset = -128f * (contrast - 1f) + 42f
        val photocopyMatrix = ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, brightnessOffset,
            0f, contrast, 0f, 0f, brightnessOffset,
            0f, 0f, contrast, 0f, brightnessOffset,
            0f, 0f, 0f, 1f, 0f
        ))

        grayMatrix.postConcat(photocopyMatrix)
        paint.colorFilter = ColorMatrixColorFilter(grayMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    /**
     * Magic Color Filter (اسکن رنگی تمیز و جادویی)
     * Whitens the paper background and boosts color saturation of stamps, seals, and ID photos.
     */
    fun toMagicColor(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // Slight saturation boost
        val satMatrix = ColorMatrix().apply { setSaturation(1.25f) }

        // Contrast and brightening
        val contrast = 1.35f
        val brightness = -128f * (contrast - 1f) + 26f
        val contrastMatrix = ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, brightness,
            0f, contrast, 0f, 0f, brightness,
            0f, 0f, contrast, 0f, brightness,
            0f, 0f, 0f, 1f, 0f
        ))

        satMatrix.postConcat(contrastMatrix)
        paint.colorFilter = ColorMatrixColorFilter(satMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    /**
     * Standard Grayscale Filter (اسکن خاکستری نرم)
     */
    fun toGrayscale(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        val grayMatrix = ColorMatrix().apply { setSaturation(0f) }
        paint.colorFilter = ColorMatrixColorFilter(grayMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    /**
     * Corrects perspective distortion (Dewarp / Rectification) by mapping 4 arbitrary corner
     * points [tl, tr, br, bl] to a rectangular flat scanned document.
     */
    fun warpPerspective(src: Bitmap, corners: FloatArray): Bitmap {
        if (corners.size < 8) return src

        val tlX = corners[0]; val tlY = corners[1]
        val trX = corners[2]; val trY = corners[3]
        val brX = corners[4]; val brY = corners[5]
        val blX = corners[6]; val blY = corners[7]

        // Calculate target rectangle width and height based on corner distances
        val widthTop = hypot((trX - tlX).toDouble(), (trY - tlY).toDouble())
        val widthBottom = hypot((brX - blX).toDouble(), (brY - blY).toDouble())
        val targetWidth = max(widthTop, widthBottom).toInt().coerceIn(300, 4000)

        val heightLeft = hypot((blX - tlX).toDouble(), (blY - tlY).toDouble())
        val heightRight = hypot((brX - trX).toDouble(), (brY - trY).toDouble())
        val targetHeight = max(heightLeft, heightRight).toInt().coerceIn(300, 4000)

        val dstCorners = floatArrayOf(
            0f, 0f,
            targetWidth.toFloat(), 0f,
            targetWidth.toFloat(), targetHeight.toFloat(),
            0f, targetHeight.toFloat()
        )

        val matrix = Matrix()
        // Hardware accelerated poly-to-poly perspective warp
        val success = matrix.setPolyToPoly(corners, 0, dstCorners, 0, 4)
        if (!success) return src

        val outBitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(outBitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val invMatrix = Matrix()
        if (matrix.invert(invMatrix)) {
            // Draw transformed bitmap
            val drawMatrix = Matrix()
            drawMatrix.setPolyToPoly(corners, 0, dstCorners, 0, 4)
            canvas.drawBitmap(src, drawMatrix, paint)
        } else {
            canvas.drawBitmap(src, matrix, paint)
        }

        return outBitmap
    }

    /**
     * Rotates bitmap by specified degrees (e.g. 90, 180, 270)
     */
    fun rotateBitmap(src: Bitmap, degrees: Float): Bitmap {
        if (degrees == 0f) return src
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(src, 0, 0, src.width, src.height, matrix, true)
    }

    /**
     * Default corner detection: 6% margin inset around document center.
     * Returns [tlX, tlY, trX, trY, brX, brY, blX, blY]
     */
    fun getDefaultCorners(width: Int, height: Int): FloatArray {
        val insetX = width * 0.06f
        val insetY = height * 0.06f
        return floatArrayOf(
            insetX, insetY,                          // Top-Left
            width - insetX, insetY,                  // Top-Right
            width - insetX, height - insetY,          // Bottom-Right
            insetX, height - insetY                   // Bottom-Left
        )
    }

    /**
     * Decodes a Bitmap from ContentResolver Uri and handles EXIF rotation correctly.
     */
    fun decodeAndRotateBitmap(contentResolver: ContentResolver, uri: Uri): Bitmap? {
        return try {
            var orientation = ExifInterface.ORIENTATION_NORMAL
            contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)
                orientation = exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            }

            var bitmap: Bitmap? = null
            contentResolver.openInputStream(uri)?.use { stream ->
                val options = BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                }
                bitmap = BitmapFactory.decodeStream(stream, null, options)
            }

            if (bitmap == null) return null

            val rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }

            if (rotationDegrees != 0f) {
                rotateBitmap(bitmap!!, rotationDegrees)
            } else {
                bitmap
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Saves bitmap to target Uri using high-quality JPEG compression.
     */
    fun saveBitmapToUri(contentResolver: ContentResolver, uri: Uri, bitmap: Bitmap): Boolean {
        return try {
            contentResolver.openOutputStream(uri)?.use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 96, stream)
            } ?: false
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Generates a standardized PDF from the scanned document and saves it into
     * public Documents / Downloads directory via MediaStore.
     */
    fun exportToPdf(context: Context, bitmap: Bitmap, title: String): Uri? {
        return try {
            val pdfDoc = PdfDocument()

            // Standard A4 dimensions in points: 595 x 842
            val pageWidth = 595
            val pageHeight = 842

            val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create()
            val page = pdfDoc.startPage(pageInfo)
            val canvas = page.canvas

            // Scale and center the scanned document into the A4 page with margins
            val margin = 36f
            val availWidth = pageWidth - (margin * 2)
            val availHeight = pageHeight - (margin * 2)

            val scale = (availWidth / bitmap.width).coerceAtMost(availHeight / bitmap.height)
            val scaledWidth = bitmap.width * scale
            val scaledHeight = bitmap.height * scale
            val left = margin + (availWidth - scaledWidth) / 2f
            val top = margin + (availHeight - scaledHeight) / 2f

            val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
            val destRect = android.graphics.RectF(left, top, left + scaledWidth, top + scaledHeight)
            canvas.drawBitmap(bitmap, null, destRect, paint)

            pdfDoc.finishPage(page)

            // Write PDF to MediaStore or app files
            val fileName = "Scan_${System.currentTimeMillis()}.pdf"
            var pdfUri: Uri? = null

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/PersianCamera")
                }
                pdfUri = context.contentResolver.insert(MediaStore.Files.getContentUri("external"), values)
                if (pdfUri != null) {
                    context.contentResolver.openOutputStream(pdfUri)?.use { out ->
                        pdfDoc.writeTo(out)
                    }
                }
            } else {
                val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "PersianCamera")
                if (!dir.exists()) dir.mkdirs()
                val file = File(dir, fileName)
                FileOutputStream(file).use { out ->
                    pdfDoc.writeTo(out)
                }
                pdfUri = Uri.fromFile(file)
            }

            pdfDoc.close()
            pdfUri
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
