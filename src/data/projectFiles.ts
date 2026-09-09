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
    name: Build Persian Camera APK
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
          name: PersianCamera-Debug-APK
          path: app/build/outputs/apk/debug/*.apk
          retention-days: 30

      - name: Upload Release APK
        uses: actions/upload-artifact@v4
        with:
          name: PersianCamera-Release-APK
          path: app/build/outputs/apk/release/*.apk
          retention-days: 30`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/MainActivity.kt',
    title: 'اکتیویتی اصلی (MainActivity.kt)',
    language: 'kotlin',
    description: 'کنترلر رابط کاربری راست‌چین، درخواست مجوز دوربین، ثبت عکس و تبدیل خودکار به سیاه و سفید',
    content: `package com.example.persiancamera

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.OnBackPressedCallback
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
    private var lastCapturedUri: Uri? = null

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[android.Manifest.permission.CAMERA] ?: false
        if (cameraGranted) {
            startCamera()
        } else {
            Toast.makeText(this, getString(R.string.camera_permission_required), Toast.LENGTH_LONG).show()
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
                if (binding.resultOverlay.visibility == View.VISIBLE) {
                    binding.resultOverlay.visibility = View.GONE
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setupListeners()

        if (PermissionUtils.hasPermissions(this)) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(PermissionUtils.REQUIRED_PERMISSIONS)
        }
    }

    private fun setupListeners() {
        // Shutter Button (ثبت عکس و تبدیل خودکار به سیاه و سفید)
        binding.btnCapture.setOnClickListener {
            triggerShutterEffect()
            binding.btnCapture.isEnabled = false

            cameraManager.takePhoto(
                onSuccess = { uri ->
                    lastCapturedUri = uri

                    // تبدیل خودکار عکس به سیاه و سفید
                    lifecycleScope.launch(Dispatchers.IO) {
                        val bitmap = ImageProcessor.decodeAndRotateBitmap(contentResolver, uri)
                        if (bitmap != null) {
                            val bwBitmap = ImageProcessor.toGrayscale(bitmap)
                            ImageProcessor.saveBitmapToUri(contentResolver, uri, bwBitmap)

                            withContext(Dispatchers.Main) {
                                binding.btnCapture.isEnabled = true
                                binding.imgResultBW.setImageBitmap(bwBitmap)
                                binding.imgLastCapture.setImageBitmap(bwBitmap)
                                binding.resultOverlay.visibility = View.VISIBLE
                                Toast.makeText(this@MainActivity, getString(R.string.bw_photo_saved), Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                binding.btnCapture.isEnabled = true
                                binding.imgLastCapture.setImageURI(uri)
                            }
                        }
                    }
                },
                onError = { exc ->
                    binding.btnCapture.isEnabled = true
                    Toast.makeText(this@MainActivity, getString(R.string.photo_save_failed, exc.message), Toast.LENGTH_SHORT).show()
                }
            )
        }

        binding.btnNewPhoto.setOnClickListener {
            binding.resultOverlay.visibility = View.GONE
        }

        binding.btnSwitchCamera.setOnClickListener {
            cameraManager.switchCamera()
        }

        binding.btnFlash.setOnClickListener {
            val status = cameraManager.toggleFlash()
            Toast.makeText(this, "فلاش: $status", Toast.LENGTH_SHORT).show()
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/util/ImageProcessor.kt',
    title: 'پردازش تصویر سیاه و سفید (ImageProcessor.kt)',
    language: 'kotlin',
    description: 'موتور تبدیل تصاویر به سیاه و سفید با ColorMatrix و تصحیح چرخش زاویه EXIF',
    content: `package com.example.persiancamera.util

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
    fun toGrayscale(src: Bitmap): Bitmap {
        val dest = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(dest)
        val paint = Paint()
        val colorMatrix = ColorMatrix().apply {
            setSaturation(0f)
        }
        paint.colorFilter = ColorMatrixColorFilter(colorMatrix)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return dest
    }

    fun decodeAndRotateBitmap(contentResolver: ContentResolver, uri: Uri): Bitmap? {
        return try {
            var orientation = ExifInterface.ORIENTATION_NORMAL
            contentResolver.openInputStream(uri)?.use { stream ->
                val exif = ExifInterface(stream)
                orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            }
            var bitmap: Bitmap? = null
            contentResolver.openInputStream(uri)?.use { stream ->
                bitmap = BitmapFactory.decodeStream(stream)
            }
            if (bitmap == null) return null
            val rotationDegrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
            if (rotationDegrees != 0f) {
                val matrix = Matrix().apply { postRotate(rotationDegrees) }
                Bitmap.createBitmap(bitmap!!, 0, 0, bitmap!!.width, bitmap!!.height, matrix, true)
            } else {
                bitmap
            }
        } catch (e: Exception) {
            null
        }
    }

    fun saveBitmapToUri(contentResolver: ContentResolver, uri: Uri, bitmap: Bitmap): Boolean {
        return try {
            contentResolver.openOutputStream(uri)?.use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 95, stream)
            } ?: false
            true
        } catch (e: Exception) {
            false
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/camera/CameraManager.kt',
    title: 'مدیریت دوربین (CameraManager.kt)',
    language: 'kotlin',
    description: 'پیاده‌سازی لایف‌سایکل CameraX، جابجایی دوربین جلو/پشت و ثبت فریم عکاسی',
    content: `package com.example.persiancamera.camera

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.example.persiancamera.storage.PhotoStorageManager

class CameraManager(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val previewView: PreviewView
) {
    private var cameraProvider: ProcessCameraProvider? = null
    private var imageCapture: ImageCapture? = null
    private val photoStorageManager = PhotoStorageManager(context)
    private var lensFacing: Int = CameraSelector.LENS_FACING_BACK
    private var flashMode: Int = ImageCapture.FLASH_MODE_AUTO

    fun startCamera(onReady: () -> Unit = {}, onError: (Exception) -> Unit = {}) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCameraUseCases()
            onReady()
        }, ContextCompat.getMainExecutor(context))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: return
        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(previewView.surfaceProvider)
        }
        imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .setFlashMode(flashMode)
            .build()
        val cameraSelector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
        provider.unbindAll()
        provider.bindToLifecycle(lifecycleOwner, cameraSelector, preview, imageCapture)
    }

    fun switchCamera() {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK)
            CameraSelector.LENS_FACING_FRONT else CameraSelector.LENS_FACING_BACK
        bindCameraUseCases()
    }
}`
  },
  {
    path: 'app/src/main/java/com/example/persiancamera/storage/PhotoStorageManager.kt',
    title: 'ذخیره عکس در گالری (PhotoStorageManager.kt)',
    language: 'kotlin',
    description: 'ذخیره خودکار تصاویر در مسیر Pictures/PersianCamera از طریق MediaStore Scoped Storage',
    content: `package com.example.persiancamera.storage

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.provider.MediaStore
import androidx.camera.core.ImageCapture
import java.text.SimpleDateFormat
import java.util.Locale

class PhotoStorageManager(private val context: Context) {
    companion object {
        private const val FILENAME_FORMAT = "yyyy-MM-dd-HH-mm-ss-SSS"
        private const val DIRECTORY_NAME = "Pictures/PersianCamera"
    }

    fun createOutputFileOptions(): ImageCapture.OutputFileOptions {
        val name = SimpleDateFormat(FILENAME_FORMAT, Locale.US).format(System.currentTimeMillis())
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
}`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    title: 'مانیفست اندروید (AndroidManifest.xml)',
    language: 'xml',
    description: 'تنظیمات دسترسی دوربین و فعال‌سازی پشتیبانی از راست‌چین (supportsRtl="true")',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/ic_menu_camera"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.PersianCamera">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
  },
  {
    path: 'app/build.gradle.kts',
    title: 'پیکربندی گریدل (app/build.gradle.kts)',
    language: 'kotlin',
    description: 'وابستگی‌های CameraX، Material Design، تنظیمات SDK 34 و امضای خودکار APK',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.persiancamera"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.persiancamera"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    val cameraxVersion = "1.3.4"
    implementation("androidx.camera:camera-core:$cameraxVersion")
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")
}`
  }
];
