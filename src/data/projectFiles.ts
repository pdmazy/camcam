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
    description: 'رابط کاربری RTL شامل صفحه خانه (Home)، دوربین (Camera)، تنظیم گوشه‌ها (Crop) و پیش‌نمایش اسکن (Result)',
    content: `<!-- لایه‌بندی ۴ صفحه‌ای اسکنر و فتوکپی مدرک -->
<!-- ۱. homeView: صفحه اصلی با دکمه دوربین، گالری و اسناد اخیر -->
<!-- ۲. cameraView: پیش‌نمایش زنده و کادر راهنما با فلاش پیش‌فرض خاموش -->
<!-- ۳. cropView: تنظیم تعاملی ۴ گوشه سند و چرخش زاویه -->
<!-- ۴. resultOverlay: پیش‌نمایش فتوکپی، خروجی PDF و اشتراک‌گذاری -->`
  }
];
