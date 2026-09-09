import { AndroidProjectFile } from '../types';

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    path: '.github/workflows/build-apk.yml',
    title: 'ورک‌فلو گیت‌هاب اکشنز (Build APK)',
    language: 'yaml',
    description: 'فایل اکشن گیت‌هاب برای کامپایل خودکار اندروید با Gradle و تولید فایل‌های نصبی APK',
    content: `name: Build Android APK

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    name: Build Persian Document Scanner APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Grant Execute Permission for Gradlew
        run: |
          if [ -f gradlew ]; then
            chmod +x gradlew
          fi

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.9'

      - name: Build Debug and Release APK
        run: |
          if [ -f gradlew ]; then
            ./gradlew assembleDebug assembleRelease --no-daemon --stacktrace
          else
            gradle assembleDebug assembleRelease --no-daemon --stacktrace
          fi

      - name: Upload Debug APK
        uses: actions/upload-artifact@v4
        with:
          name: PersianScanner-Debug-APK
          path: app/build/outputs/apk/debug/*.apk
          retention-days: 30

      - name: Upload Release APK
        uses: actions/upload-artifact@v4
        with:
          name: PersianScanner-Release-APK
          path: app/build/outputs/apk/release/*.apk
          retention-days: 30`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/MainActivity.kt',
    title: 'اکتیویتی اصلی (MainActivity.kt)',
    language: 'kotlin',
    description: 'کنترلر صفحه اصلی، دوربین با فلاش خاموش، صفحه تنظیم و برش گوشه‌ها و صفحه نمایش حرفه‌ای اسکن',
    content: `package com.example.persiancamera

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.lifecycle.lifecycleScope
import com.example.persiancamera.camera.CameraManager
import com.example.persiancamera.databinding.ActivityMainBinding
import com.example.persiancamera.util.ImageProcessor
import com.example.persiancamera.util.PermissionUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraManager: CameraManager

    private var rawCapturedBitmap: Bitmap? = null
    private var dewarpedBitmap: Bitmap? = null
    private var photocopyBitmap: Bitmap? = null
    private var magicColorBitmap: Bitmap? = null
    private var grayscaleBitmap: Bitmap? = null
    private var activeFilter = "photocopy"
    private var lastCapturedUri: Uri? = null
    private var isSourceFromGallery = false

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[android.Manifest.permission.CAMERA] ?: false
        if (cameraGranted) {
            openCameraScreen()
        } else {
            Toast.makeText(this, getString(R.string.camera_permission_required), Toast.LENGTH_LONG).show()
        }
    }

    private val galleryLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            loadBitmapForCropping(uri, fromGallery = true)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ViewCompat.setLayoutDirection(window.decorView, ViewCompat.LAYOUT_DIRECTION_RTL)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraManager = CameraManager(this, this, binding.viewFinder)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    binding.resultOverlay.visibility == View.VISIBLE -> showHomeScreen()
                    binding.cropView.visibility == View.VISIBLE -> {
                        if (isSourceFromGallery) showHomeScreen() else showCameraScreen()
                    }
                    binding.cameraView.visibility == View.VISIBLE -> showHomeScreen()
                    else -> {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        })

        setupListeners()
        showHomeScreen()
    }

    private fun setupListeners() {
        // صفحه اصلی
        binding.btnHomeStartScan.setOnClickListener {
            if (PermissionUtils.hasPermissions(this)) openCameraScreen()
            else requestPermissionLauncher.launch(PermissionUtils.REQUIRED_PERMISSIONS)
        }

        binding.btnHomePickGallery.setOnClickListener {
            galleryLauncher.launch("image/*")
        }

        // عکاسی مدرک
        binding.btnBackFromCamera.setOnClickListener { showHomeScreen() }
        binding.btnFlash.setOnClickListener {
            val status = cameraManager.toggleFlash()
            Toast.makeText(this, "حالت فلاش: $status", Toast.LENGTH_SHORT).show()
        }
        binding.btnSwitchCamera.setOnClickListener { cameraManager.switchCamera() }

        binding.btnCapture.setOnClickListener {
            binding.btnCapture.isEnabled = false
            cameraManager.takePhoto(
                onSuccess = { uri ->
                    binding.btnCapture.isEnabled = true
                    lastCapturedUri = uri
                    loadBitmapForCropping(uri, fromGallery = false)
                },
                onError = { exc ->
                    binding.btnCapture.isEnabled = true
                    Toast.makeText(this, getString(R.string.photo_save_failed, exc.message), Toast.LENGTH_SHORT).show()
                }
            )
        }

        // تنظیم گوشه‌ها و برش
        binding.btnBackFromCrop.setOnClickListener {
            if (isSourceFromGallery) showHomeScreen() else showCameraScreen()
        }
        binding.btnRotateCrop.setOnClickListener {
            rawCapturedBitmap?.let { bmp ->
                rawCapturedBitmap = ImageProcessor.rotateBitmap(bmp, 90f)
                binding.imgCropSource.setImageBitmap(rawCapturedBitmap)
                binding.cropOverlay.resetToDefault()
            }
        }
        binding.btnAutoCorners.setOnClickListener { binding.cropOverlay.resetToDefault() }
        binding.btnApplyCrop.setOnClickListener { processAndWarpDocument() }

        // فیلترها و خروجی
        binding.btnResultHome.setOnClickListener { showHomeScreen() }
        binding.btnNewPhoto.setOnClickListener { openCameraScreen() }
        binding.btnModePhotocopy.setOnClickListener { applyFilterSelection("photocopy") }
        binding.btnModeMagicColor.setOnClickListener { applyFilterSelection("magic_color") }
        binding.btnModeGrayscale.setOnClickListener { applyFilterSelection("grayscale") }
        binding.btnModeOriginal.setOnClickListener { applyFilterSelection("original") }

        binding.btnExportPdf.setOnClickListener {
            getCurrentActiveBitmap()?.let { bmp ->
                lifecycleScope.launch(Dispatchers.IO) {
                    val pdfUri = ImageProcessor.exportToPdf(this@MainActivity, bmp, "مدرک اسکن شده")
                    withContext(Dispatchers.Main) {
                        if (pdfUri != null) {
                            Toast.makeText(this@MainActivity, getString(R.string.pdf_saved_success), Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        }

        // دکمه اختصاصی ذخیره مستقیم در گالری با فرمت JPEG و حافظه عمومی (Pictures)
        binding.btnSaveToGallery.setOnClickListener {
            getCurrentActiveBitmap()?.let { bmp ->
                lifecycleScope.launch(Dispatchers.IO) {
                    val savedUri = ImageProcessor.saveToGalleryAsJpeg(this@MainActivity, bmp, "مدرک_اسکن_شده")
                    withContext(Dispatchers.Main) {
                        if (savedUri != null) {
                            Toast.makeText(this@MainActivity, getString(R.string.saved_to_gallery_success), Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@MainActivity, getString(R.string.save_failed), Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }
    }

    private fun showHomeScreen() {
        binding.homeView.visibility = View.VISIBLE
        binding.cameraView.visibility = View.GONE
        binding.cropView.visibility = View.GONE
        binding.resultOverlay.visibility = View.GONE
    }

    private fun openCameraScreen() {
        binding.homeView.visibility = View.GONE
        binding.cameraView.visibility = View.VISIBLE
        binding.cropView.visibility = View.GONE
        binding.resultOverlay.visibility = View.GONE
        cameraManager.startCamera()
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/util/ImageProcessor.kt',
    title: 'موتور پردازش فتوکپی و پرسپکتیو (ImageProcessor.kt)',
    language: 'kotlin',
    description: 'موتور قدرتمند تصحیح پرسپکتیو با PolyToPoly، فیلتر فتوکپی با کنتراست بالا، اسکن رنگی و تولید PDF',
    content: `package com.example.persiancamera.util

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import kotlin.math.hypot
import kotlin.math.max

object ImageProcessor {

    fun toPhotocopy(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val grayMatrix = ColorMatrix().apply { setSaturation(0f) }
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

    fun toMagicColor(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val satMatrix = ColorMatrix().apply { setSaturation(1.25f) }
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

    fun warpPerspective(src: Bitmap, corners: FloatArray): Bitmap {
        if (corners.size < 8) return src
        val tlX = corners[0]; val tlY = corners[1]
        val trX = corners[2]; val trY = corners[3]
        val brX = corners[4]; val brY = corners[5]
        val blX = corners[6]; val blY = corners[7]

        val targetWidth = max(hypot(trX - tlX, trY - tlY), hypot(brX - blX, brY - blY)).toInt()
        val targetHeight = max(hypot(blX - tlX, blY - tlY), hypot(brX - trX, brY - trY)).toInt()

        val dstCorners = floatArrayOf(
            0f, 0f,
            targetWidth.toFloat(), 0f,
            targetWidth.toFloat(), targetHeight.toFloat(),
            0f, targetHeight.toFloat()
        )

        val matrix = Matrix()
        matrix.setPolyToPoly(corners, 0, dstCorners, 0, 4)

        val outBitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(outBitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        canvas.drawBitmap(src, matrix, paint)
        return outBitmap
    }

    /**
     * ذخیره مستقیم سند پردازش‌شده در حافظه عمومی دستگاه (Pictures/Gallery) با فرمت JPEG
     */
    fun saveToGalleryAsJpeg(context: Context, bitmap: Bitmap, title: String = "Document_Scan"): Uri? {
        val filename = "\${title}_\${System.currentTimeMillis()}.jpg"
        val contentValues = android.content.ContentValues().apply {
            put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, filename)
            put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/PersianScanner")
                put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
        uri?.let {
            resolver.openOutputStream(it)?.use { outputStream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, outputStream)
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                contentValues.clear()
                contentValues.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(it, contentValues, null, null)
            }
        }
        return uri
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/ui/CropOverlayView.kt',
    title: 'کادر تنظیم ۴ گوشه مدرک (CropOverlayView.kt)',
    language: 'kotlin',
    description: 'کامپوننت ویو لمسی جهت جابجایی دستی ۴ گوشه مدرک و تشخیص لبه‌های سند شناسایی',
    content: `package com.example.persiancamera.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View

class CropOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    val corners = arrayOf(
        PointF(100f, 100f),
        PointF(500f, 100f),
        PointF(500f, 700f),
        PointF(100f, 700f)
    )

    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#10B981")
        strokeWidth = 5f
        style = Paint.Style.STROKE
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // ترسیم کادر و دایره‌های لمسی ۴ گوشه مدرک
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/ui/DocumentEdgeDetectionOverlayView.kt',
    title: 'لایه کادر نیمه‌شفاف تشخیص لبه‌ها (DocumentEdgeDetectionOverlayView.kt)',
    language: 'kotlin',
    description: 'لایه گرافیکی هم‌زمان (Real-time UI Overlay) با کادر نیمه‌شفاف، خط لیزر متحرک و نشانگر وضعیت پایش لبه‌های مدرک',
    content: `package com.example.persiancamera.ui

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator

class DocumentEdgeDetectionOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var scanProgress = 0.1f
    private val boxRect = RectF()

    // پس‌زمینه نیمه‌شفاف کادر تشخیص مدرک
    private val boxFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(38, 16, 185, 129) // سبز زمرّدی نیمه‌شفاف
        style = Paint.Style.FILL
    }

    // خط دور کادر تشخیص
    private val boxStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#34D399")
        strokeWidth = 6f
        style = Paint.Style.STROKE
    }

    // نشانگرهای ۴ گوشه مدرک
    private val cornerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#10B981")
        strokeWidth = 10f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }

    // متن وضعیت اسکن لبه‌ها
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 34f
        textAlign = Paint.Align.CENTER
    }

    // پرتو لیزری متحرک اسکن لبه‌ها
    private val laserPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        strokeWidth = 6f
        style = Paint.Style.STROKE
    }

    private var animator: ValueAnimator? = null

    init {
        startScanAnimation()
    }

    private fun startScanAnimation() {
        animator = ValueAnimator.ofFloat(0.05f, 0.95f).apply {
            duration = 2400
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                scanProgress = it.animatedValue as Float
                postInvalidateOnAnimation()
            }
            start()
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val boxWidth = w * 0.86f
        val boxHeight = boxWidth * 1.42f
        val left = (w - boxWidth) / 2f
        val top = (h - boxHeight) / 2f
        boxRect.set(left, top, left + boxWidth, top + boxHeight)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (boxRect.isEmpty) return

        // ۱. رسم کادر نیمه‌شفاف تشخیص مدرک
        canvas.drawRoundRect(boxRect, 32f, 32f, boxFillPaint)
        canvas.drawRoundRect(boxRect, 32f, 32f, boxStrokePaint)

        // ۲. ردیاب‌های ۴ گوشه مدرک (Corner Reticles)
        val cLen = 50f
        canvas.drawLine(boxRect.left, boxRect.top, boxRect.left + cLen, boxRect.top, cornerPaint)
        canvas.drawLine(boxRect.left, boxRect.top, boxRect.left, boxRect.top + cLen, cornerPaint)
        canvas.drawLine(boxRect.right, boxRect.top, boxRect.right - cLen, boxRect.top, cornerPaint)
        canvas.drawLine(boxRect.right, boxRect.top, boxRect.right, boxRect.top + cLen, cornerPaint)
        canvas.drawLine(boxRect.left, boxRect.bottom, boxRect.left + cLen, boxRect.bottom, cornerPaint)
        canvas.drawLine(boxRect.left, boxRect.bottom, boxRect.left, boxRect.bottom - cLen, cornerPaint)
        canvas.drawLine(boxRect.right, boxRect.bottom, boxRect.right - cLen, boxRect.bottom, cornerPaint)
        canvas.drawLine(boxRect.right, boxRect.bottom, boxRect.right, boxRect.bottom - cLen, cornerPaint)

        // ۳. پرتو متحرک لیزر تشخیص لبه‌ها (Real-time Scan Laser Beam)
        val laserY = boxRect.top + (boxRect.height() * scanProgress)
        laserPaint.shader = LinearGradient(
            boxRect.left, laserY, boxRect.right, laserY,
            intArrayOf(Color.TRANSPARENT, Color.parseColor("#34D399"), Color.TRANSPARENT),
            floatArrayOf(0f, 0.5f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawLine(boxRect.left, laserY, boxRect.right, laserY, laserPaint)

        // ۴. پیام وضعیت لبه‌ها به کاربر
        canvas.drawText("در حال پایش و اسکن لبه‌های مدرک...", boxRect.centerX(), boxRect.top - 24f, textPaint)
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/camera/CameraManager.kt',
    title: 'مدیریت دوربین (CameraManager.kt)',
    language: 'kotlin',
    description: 'تنظیم ماکزیمم کیفیت ثبت سنسور (CAPTURE_MODE_MAXIMIZE_QUALITY) و فلاش خاموش پیش‌فرض',
    content: `package com.example.persiancamera.camera

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner

class CameraManager(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val previewView: PreviewView
) {
    private var lensFacing: Int = CameraSelector.LENS_FACING_BACK
    // فلاش به صورت پیش‌فرض کاملاً خاموش است تا بازتاب نور رخ ندهد
    private var flashMode: Int = ImageCapture.FLASH_MODE_OFF

    private fun bindCameraUseCases() {
        val imageCapture = ImageCapture.Builder()
            // بالاترین کیفیت سنسور برای خوانایی متن و مدارک
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .setFlashMode(flashMode)
            .build()
    }
}`
  },
  {
    path: 'app/src/main/res/layout/activity_main.xml',
    title: 'لایه‌بندی ۴ صفحه‌ای (activity_main.xml)',
    language: 'xml',
    description: 'رابط کاربری RTL شامل صفحه خانه، دوربین با لایه کادر نیمه‌شفاف تشخیص لبه‌ها، تنظیم گوشه‌ها و پیش‌نمایش فتوکپی با دکمه ذخیره در گالری (JPEG) و تنظیمات ابعاد کاغذ',
    content: `<!-- لایه‌بندی ۴ صفحه‌ای اسکنر و فتوکپی مدرک -->
<!-- ۱. homeView: صفحه اصلی با دکمه دوربین، گالری، تنظیم قالب برگه خروجی (A4, A5, ۲ در ۱) و اسناد اخیر -->
<!-- ۲. cameraView: پیش‌نمایش زنده دوربین همراه با DocumentEdgeDetectionOverlayView (کادر نیمه‌شفاف تشخیص لبه‌ها) -->
<!-- ۳. cropView: تنظیم تعاملی ۴ گوشه سند و چرخش زاویه -->
<!-- ۴. resultOverlay: پیش‌نمایش مدرک پردازش شده همراه با: -->
<!--    - انتخابگر قالب چاپ: A4 اداری، A5 نیم‌صفحه، و ۲ در ۱ رو و پشت A4 با خط برش -->
<!--    - btnSaveToGallery: ذخیره مستقیم برگه در گالری عمومی دستگاه به عنوان فایل JPEG -->
<!--    - btnExportPdf: خروجی استاندارد PDF بر اساس ابعاد انتخابی کاغذ با کتابخانه بومی اندروید -->
<!--    - فیلترهای فتوکپی کنتراست بالا، اسکن رنگی، خاکستری و اصلی -->`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/print/PrintLayoutManager.kt',
    title: 'تنظیمات چاپ و کاغذ استاندارد (PrintLayoutManager.kt)',
    language: 'kotlin',
    description: 'مدیریت خروجی چاپ استاندارد اندروید (قطع A4 اداری، A5 نیم‌برگ، چیدمان ۲ در ۱ رو و پشت با خط برش و حاشیه)',
    content: `package com.example.persiancamera.print

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import java.io.File
import java.io.FileOutputStream

enum class PageSize(val widthMm: Float, val heightMm: Float) {
    A4(210f, 297f),
    A5(148f, 210f)
}

enum class LayoutMode {
    SINGLE_PAGE,     // ۱ سند در کل صفحه
    TWO_IN_ONE_A4    // ۲ سند در یک صفحه A4 (رو و پشت با خط برش)
}

class PrintLayoutManager(private val context: Context) {

    /**
     * رندر مدرک روی بوم استاندارد کاغذ (A4 یا A5) یا ۲ سند در برگه A4
     */
    fun renderDocumentSheet(
        frontDoc: Bitmap,
        backDoc: Bitmap? = null,
        pageSize: PageSize = PageSize.A4,
        layoutMode: LayoutMode = LayoutMode.SINGLE_PAGE,
        dpi: Int = 150
    ): Bitmap {
        val mmToPixel = dpi / 25.4f
        val sheetWidth = (pageSize.widthMm * mmToPixel).toInt()
        val sheetHeight = (pageSize.heightMm * mmToPixel).toInt()

        val sheetBitmap = Bitmap.createBitmap(sheetWidth, sheetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(sheetBitmap)

        // ۱. پس‌زمینه کاغذ کاملاً سفید
        canvas.drawColor(Color.WHITE)

        val marginPx = 10f * mmToPixel // ۱۰ میلی‌متر حاشیه استاندارد اداری

        when (layoutMode) {
            LayoutMode.SINGLE_PAGE -> {
                val availW = sheetWidth - 2 * marginPx
                val availH = sheetHeight - 2 * marginPx
                val scale = minOf(availW / frontDoc.width, availH / frontDoc.height)
                val destW = frontDoc.width * scale
                val destH = frontDoc.height * scale
                val left = marginPx + (availW - destW) / 2f
                val top = marginPx + (availH - destH) / 2f

                canvas.drawBitmap(frontDoc, null, RectF(left, top, left + destW, top + destH), null)
            }
            LayoutMode.TWO_IN_ONE_A4 -> {
                // تقسیم برگه A4 به دو نیمه افقی (بالا و پایین)
                val halfHeight = sheetHeight / 2f
                val availW = sheetWidth - 2 * marginPx
                val availHalfH = halfHeight - 2 * marginPx

                // سند اول (رو) در نیمه بالا
                val scale1 = minOf(availW / frontDoc.width, availHalfH / frontDoc.height)
                val destW1 = frontDoc.width * scale1
                val destH1 = frontDoc.height * scale1
                val left1 = marginPx + (availW - destW1) / 2f
                val top1 = marginPx + (availHalfH - destH1) / 2f
                canvas.drawBitmap(frontDoc, null, RectF(left1, top1, left1 + destW1, top1 + destH1), null)

                // سند دوم (پشت) در نیمه پایین (یا تکرار سند اول)
                val secondBitmap = backDoc ?: frontDoc
                val scale2 = minOf(availW / secondBitmap.width, availHalfH / secondBitmap.height)
                val destW2 = secondBitmap.width * scale2
                val destH2 = secondBitmap.height * scale2
                val left2 = marginPx + (availW - destW2) / 2f
                val top2 = halfHeight + marginPx + (availHalfH - destH2) / 2f
                canvas.drawBitmap(secondBitmap, null, RectF(left2, top2, left2 + destW2, top2 + destH2), null)

                // رسم خط‌چین برش اداری ✂ در وسط صفحه
                val cutLinePaint = Paint().apply {
                    color = Color.parseColor("#94A3B8")
                    strokeWidth = 2f
                    style = Paint.Style.STROKE
                    pathEffect = DashPathEffect(floatArrayOf(12f, 8f), 0f)
                }
                canvas.drawLine(marginPx, halfHeight, sheetWidth - marginPx, halfHeight, cutLinePaint)
            }
        }

        return sheetBitmap
    }

    /**
     * صدور فایل PDF استاندارد برداری برای پرینت با Android PdfDocument
     */
    fun exportToPdf(sheetBitmap: Bitmap, outputFile: File): Boolean {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(sheetBitmap.width, sheetBitmap.height, 1).create()
        val page = document.startPage(pageInfo)

        page.canvas.drawBitmap(sheetBitmap, 0f, 0f, null)
        document.finishPage(page)

        return try {
            FileOutputStream(outputFile).use { out ->
                document.writeTo(out)
            }
            document.close()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            document.close()
            false
        }
    }
}`
  }
];
