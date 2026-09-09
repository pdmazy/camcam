package com.example.persiancamera.util

import android.content.ContentResolver
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.media.ExifInterface
import android.net.Uri

object ImageProcessor {

    /**
     * Converts any input Bitmap into a clean, high-contrast Photocopy / Scanned Document.
     * Removes grey shadow backgrounds, enhances ink contrast, and produces authentic
     * photocopy appearance 100% offline using hardware-accelerated ColorMatrix.
     */
    fun toPhotocopy(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        // Step 1: Desaturate (Grayscale)
        val grayMatrix = ColorMatrix().apply { setSaturation(0f) }

        // Step 2: High Contrast + Paper Whitening Offset
        val contrast = 1.95f
        val brightnessOffset = -128f * (contrast - 1f) + 38f
        val photocopyMatrix = ColorMatrix(floatArrayOf(
            contrast, 0f, 0f, 0f, brightnessOffset,
            0f, contrast, 0f, 0f, brightnessOffset,
            0f, 0f, contrast, 0f, brightnessOffset,
            0f, 0f, 0f, 1f, 0f
        ))

        // Combine: Grayscale then Photocopy contrast curve
        grayMatrix.postConcat(photocopyMatrix)

        paint.colorFilter = ColorMatrixColorFilter(grayMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    /**
     * Converts any input Bitmap to standard balanced Grayscale.
     */
    fun toGrayscale(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint()
        val colorMatrix = ColorMatrix().apply {
            setSaturation(0f) // Completely removes saturation to create pure grayscale
        }
        paint.colorFilter = ColorMatrixColorFilter(colorMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    /**
     * Decodes a Bitmap from ContentResolver Uri and handles EXIF rotation correctly.
     */
    fun decodeAndRotateBitmap(contentResolver: ContentResolver, uri: Uri): Bitmap? {
        return try {
            // Read EXIF orientation
            var orientation = ExifInterface.ORIENTATION_NORMAL
            contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)
                orientation = exif.getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            }

            // Decode image bytes
            var bitmap: Bitmap? = null
            contentResolver.openInputStream(uri)?.use { stream ->
                bitmap = BitmapFactory.decodeStream(stream)
            }

            if (bitmap == null) return null

            // Determine rotation degrees
            val rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }

            if (rotationDegrees != 0f) {
                val matrix = Matrix().apply { postRotate(rotationDegrees) }
                val rotated = Bitmap.createBitmap(
                    bitmap!!, 0, 0, bitmap!!.width, bitmap!!.height, matrix, true
                )
                if (rotated != bitmap) {
                    bitmap!!.recycle()
                }
                rotated
            } else {
                bitmap
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Overwrites or saves the processed grayscale image back to the given Uri.
     */
    fun saveBitmapToUri(contentResolver: ContentResolver, uri: Uri, bitmap: Bitmap): Boolean {
        return try {
            contentResolver.openOutputStream(uri)?.use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
            } ?: false
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
