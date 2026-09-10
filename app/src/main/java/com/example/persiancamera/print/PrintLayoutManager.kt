package com.example.persiancamera.print

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.FileOutputStream

enum class PageSize(val title: String, val widthMm: Float, val heightMm: Float) {
    A4("A4 اداری", 210f, 297f),
    A5("A5 نیم‌صفحه", 148f, 210f)
}

enum class Orientation(val title: String) {
    PORTRAIT("عمودی"),
    LANDSCAPE("افقی")
}

enum class LayoutMode(val title: String) {
    SINGLE_PAGE("۱ سند در صفحه"),
    TWO_IN_ONE_A4("۲ در ۱ A4 (رو و پشت)")
}

data class PrintSettings(
    var pageSize: PageSize = PageSize.A4,
    var orientation: Orientation = Orientation.PORTRAIT,
    var layoutMode: LayoutMode = LayoutMode.SINGLE_PAGE,
    var marginMm: Float = 10f,
    var autoRotateLandscape: Boolean = true,
    var fillCardRatio: Boolean = false,
    var secondaryBitmap: Bitmap? = null
)

class PrintLayoutManager(private val context: Context) {

    /**
     * رندر مدرک روی بوم استاندارد کاغذ (A4 یا A5) یا ۲ سند در برگه A4
     */
    fun renderDocumentSheet(
        frontDoc: Bitmap,
        backDoc: Bitmap? = null,
        settings: PrintSettings,
        dpi: Int = 150
    ): Bitmap {
        val mmToPixel = dpi / 25.4f
        
        // محاسبه ابعاد برگه بر اساس سایز و جهت
        var sheetWidthMm = settings.pageSize.widthMm
        var sheetHeightMm = settings.pageSize.heightMm

        if (settings.orientation == Orientation.LANDSCAPE) {
            sheetWidthMm = settings.pageSize.heightMm
            sheetHeightMm = settings.pageSize.widthMm
        }

        val sheetWidth = (sheetWidthMm * mmToPixel).toInt().coerceAtLeast(100)
        val sheetHeight = (sheetHeightMm * mmToPixel).toInt().coerceAtLeast(100)

        val sheetBitmap = Bitmap.createBitmap(sheetWidth, sheetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(sheetBitmap)

        // ۱. پس‌زمینه کاغذ کاملاً سفید اداری
        canvas.drawColor(Color.WHITE)

        val marginPx = settings.marginMm * mmToPixel
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        when (settings.layoutMode) {
            LayoutMode.SINGLE_PAGE -> {
                val availW = sheetWidth - 2 * marginPx
                val availH = sheetHeight - 2 * marginPx

                var drawDoc = frontDoc
                // چرخش هوشمند در صورت افقی بودن سند و عمودی بودن برگه (یا برعکس)
                if (settings.autoRotateLandscape) {
                    val isDocLandscape = frontDoc.width > frontDoc.height
                    val isSheetLandscape = sheetWidth > sheetHeight
                    if (isDocLandscape != isSheetLandscape) {
                        val matrix = android.graphics.Matrix().apply { postRotate(90f) }
                        drawDoc = Bitmap.createBitmap(frontDoc, 0, 0, frontDoc.width, frontDoc.height, matrix, true)
                    }
                }

                val scale = minOf(availW / drawDoc.width.toFloat(), availH / drawDoc.height.toFloat())
                val destW = drawDoc.width * scale
                val destH = drawDoc.height * scale
                val left = marginPx + (availW - destW) / 2f
                val top = marginPx + (availH - destH) / 2f

                canvas.drawBitmap(drawDoc, null, RectF(left, top, left + destW, top + destH), paint)
            }

            LayoutMode.TWO_IN_ONE_A4 -> {
                // تقسیم برگه A4 به دو نیمه بالا و پایین برای کارت و مدارک دو طرفه
                val halfHeight = sheetHeight / 2f
                val availW = sheetWidth - 2 * marginPx
                val availHalfH = halfHeight - 2 * marginPx

                // ۱. سند اول (رو) در نیمه بالا
                val scale1 = minOf(availW / frontDoc.width.toFloat(), availHalfH / frontDoc.height.toFloat())
                val destW1 = frontDoc.width * scale1
                val destH1 = frontDoc.height * scale1
                val left1 = marginPx + (availW - destW1) / 2f
                val top1 = marginPx + (availHalfH - destH1) / 2f
                canvas.drawBitmap(frontDoc, null, RectF(left1, top1, left1 + destW1, top1 + destH1), paint)

                // ۲. سند دوم (پشت) در نیمه پایین (یا تکرار سند اول)
                val secondDoc = backDoc ?: settings.secondaryBitmap ?: frontDoc
                val scale2 = minOf(availW / secondDoc.width.toFloat(), availHalfH / secondDoc.height.toFloat())
                val destW2 = secondDoc.width * scale2
                val destH2 = secondDoc.height * scale2
                val left2 = marginPx + (availW - destW2) / 2f
                val top2 = halfHeight + marginPx + (availHalfH - destH2) / 2f
                canvas.drawBitmap(secondDoc, null, RectF(left2, top2, left2 + destW2, top2 + destH2), paint)

                // ۳. رسم خط‌چین برش اداری در وسط صفحه ✂
                val cutLinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#94A3B8")
                    strokeWidth = 2f * (dpi / 150f)
                    style = Paint.Style.STROKE
                    pathEffect = DashPathEffect(floatArrayOf(12f * (dpi / 150f), 8f * (dpi / 150f)), 0f)
                }
                canvas.drawLine(marginPx, halfHeight, sheetWidth - marginPx, halfHeight, cutLinePaint)

                // نوشتن برچسب راهنمای رو و پشت
                val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = Color.parseColor("#94A3B8")
                    textSize = 10f * mmToPixel
                    textAlign = Paint.Align.RIGHT
                }
                canvas.drawText("روی مدرک (Front)", sheetWidth - marginPx, marginPx + textPaint.textSize, textPaint)
                canvas.drawText("پشت مدرک (Back)", sheetWidth - marginPx, halfHeight + marginPx + textPaint.textSize, textPaint)
            }
        }

        return sheetBitmap
    }

    /**
     * صدور مستقیم فایل PDF استاندارد از برگه
     */
    fun exportToPdfUri(sheetBitmap: Bitmap, title: String): Uri? {
        return try {
            val pdfDoc = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(sheetBitmap.width, sheetBitmap.height, 1).create()
            val page = pdfDoc.startPage(pageInfo)

            page.canvas.drawBitmap(sheetBitmap, 0f, 0f, null)
            pdfDoc.finishPage(page)

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
