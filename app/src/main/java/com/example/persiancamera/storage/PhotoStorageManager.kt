package com.example.persiancamera.storage

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.camera.core.ImageCapture
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Locale

class PhotoStorageManager(private val context: Context) {

    companion object {
        private const val FILENAME_FORMAT = "yyyy-MM-dd-HH-mm-ss-SSS"
        private const val DIRECTORY_NAME = "Pictures/PersianCamera"
    }

    /**
     * Builds standard MediaStore OutputFileOptions for saving the captured photo directly into
     * the device's Gallery / Pictures directory.
     */
    fun createOutputFileOptions(): ImageCapture.OutputFileOptions {
        val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US)
            .format(System.currentTimeMillis())

        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "IMG_$name.jpg")
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, DIRECTORY_NAME)
                put(MediaStore.Images.Media.IS_PENDING, 0)
            }
        }

        return ImageCapture.OutputFileOptions.Builder(
            context.contentResolver,
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            contentValues
        ).build()
    }

    /**
     * ذخیره مستقیم برگه اسکن شده در گالری عمومی دستگاه (Pictures / DCIM) با فرمت JPEG
     */
    fun saveBitmapToGallery(bitmap: Bitmap, prefix: String = "SCAN"): Uri? {
        val timeStamp = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
        val fileName = "${prefix}_$timeStamp.jpg"

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
                    put(MediaStore.Images.Media.RELATIVE_PATH, DIRECTORY_NAME)
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }

                val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    context.contentResolver.openOutputStream(uri)?.use { stream ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 96, stream)
                    }
                    contentValues.clear()
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                    context.contentResolver.update(uri, contentValues, null, null)
                    uri
                } else null
            } else {
                val dir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "PersianCamera")
                if (!dir.exists()) dir.mkdirs()
                val file = File(dir, fileName)
                FileOutputStream(file).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 96, out)
                }
                MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf("image/jpeg"), null)
                Uri.fromFile(file)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
