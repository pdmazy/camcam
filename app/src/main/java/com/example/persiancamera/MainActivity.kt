package com.example.persiancamera

import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
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

    // Current working bitmaps
    private var rawCapturedBitmap: Bitmap? = null
    private var dewarpedBitmap: Bitmap? = null
    private var photocopyBitmap: Bitmap? = null
    private var magicColorBitmap: Bitmap? = null
    private var grayscaleBitmap: Bitmap? = null
    private var activeFilter = "photocopy"
    private var lastCapturedUri: Uri? = null

    // Track if current crop came from gallery or camera
    private var isSourceFromGallery = false

    // Permission launcher for Camera
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[android.Manifest.permission.CAMERA] ?: false
        if (cameraGranted) {
            openCameraScreen()
        } else {
            Toast.makeText(
                this,
                getString(R.string.camera_permission_required),
                Toast.LENGTH_LONG
            ).show()
        }
    }

    // Gallery Picker launcher
    private val galleryLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            loadBitmapForCropping(uri, fromGallery = true)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Force Persian RTL Layout Direction
        ViewCompat.setLayoutDirection(window.decorView, ViewCompat.LAYOUT_DIRECTION_RTL)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraManager = CameraManager(this, this, binding.viewFinder)

        // Handle Android Back Navigation gracefully between screens
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    binding.resultOverlay.visibility == View.VISIBLE -> {
                        showHomeScreen()
                    }
                    binding.cropView.visibility == View.VISIBLE -> {
                        if (isSourceFromGallery) {
                            showHomeScreen()
                        } else {
                            showCameraScreen()
                        }
                    }
                    binding.cameraView.visibility == View.VISIBLE -> {
                        showHomeScreen()
                    }
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
        // ================= HOME DASHBOARD LISTENERS =================
        binding.btnHomeStartScan.setOnClickListener {
            if (PermissionUtils.hasPermissions(this)) {
                openCameraScreen()
            } else {
                requestPermissionLauncher.launch(PermissionUtils.REQUIRED_PERMISSIONS)
            }
        }

        binding.btnHomePickGallery.setOnClickListener {
            galleryLauncher.launch("image/*")
        }

        binding.btnHomeOpenRecent.setOnClickListener {
            if (photocopyBitmap != null || dewarpedBitmap != null) {
                showResultScreen()
            }
        }

        // ================= CAMERA SCREEN LISTENERS =================
        binding.btnBackFromCamera.setOnClickListener {
            showHomeScreen()
        }

        binding.btnFlash.setOnClickListener {
            val status = cameraManager.toggleFlash()
            Toast.makeText(this, "حالت فلاش: $status", Toast.LENGTH_SHORT).show()
        }

        binding.btnSwitchCamera.setOnClickListener {
            cameraManager.switchCamera()
        }

        binding.btnCapture.setOnClickListener {
            triggerShutterEffect()
            binding.btnCapture.isEnabled = false

            cameraManager.takePhoto(
                onSuccess = { uri ->
                    binding.btnCapture.isEnabled = true
                    lastCapturedUri = uri
                    loadBitmapForCropping(uri, fromGallery = false)
                },
                onError = { exc ->
                    binding.btnCapture.isEnabled = true
                    val errorMsg = getString(R.string.photo_save_failed, exc.message)
                    Toast.makeText(this@MainActivity, errorMsg, Toast.LENGTH_SHORT).show()
                }
            )
        }

        binding.imgLastCapture.setOnClickListener {
            if (photocopyBitmap != null) {
                showResultScreen()
            }
        }

        // ================= CROP & PERSPECTIVE LISTENERS =================
        binding.btnBackFromCrop.setOnClickListener {
            if (isSourceFromGallery) showHomeScreen() else showCameraScreen()
        }

        binding.btnRotateCrop.setOnClickListener {
            rawCapturedBitmap?.let { bmp ->
                val rotated = ImageProcessor.rotateBitmap(bmp, 90f)
                rawCapturedBitmap = rotated
                binding.imgCropSource.setImageBitmap(rotated)
                binding.cropOverlay.resetToDefault()
            }
        }

        binding.btnAutoCorners.setOnClickListener {
            binding.cropOverlay.resetToDefault()
            Toast.makeText(this, "کادر تنظیم شد", Toast.LENGTH_SHORT).show()
        }

        binding.btnApplyCrop.setOnClickListener {
            processAndWarpDocument()
        }

        // ================= RESULT SCREEN LISTENERS =================
        binding.btnResultHome.setOnClickListener {
            showHomeScreen()
        }

        binding.btnNewPhoto.setOnClickListener {
            openCameraScreen()
        }

        // Filter Mode Switchers
        binding.btnModePhotocopy.setOnClickListener {
            applyFilterSelection("photocopy")
        }

        binding.btnModeMagicColor.setOnClickListener {
            applyFilterSelection("magic_color")
        }

        binding.btnModeGrayscale.setOnClickListener {
            applyFilterSelection("grayscale")
        }

        binding.btnModeOriginal.setOnClickListener {
            applyFilterSelection("original")
        }

        // Rotate Result
        binding.btnRotateResult.setOnClickListener {
            dewarpedBitmap?.let { src ->
                val rotated = ImageProcessor.rotateBitmap(src, 90f)
                dewarpedBitmap = rotated
                recomputeAllFilters(rotated)
            }
        }

        // Share Document
        binding.btnShareDoc.setOnClickListener {
            val currentBitmap = getCurrentActiveBitmap()
            if (currentBitmap != null) {
                lastCapturedUri?.let { uri ->
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "image/jpeg"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(shareIntent, "اشتراک‌گذاری مدرک اسکن شده"))
                } ?: Toast.makeText(this, "تصویری برای اشتراک یافت نشد", Toast.LENGTH_SHORT).show()
            }
        }

        // Export PDF
        binding.btnExportPdf.setOnClickListener {
            val currentBitmap = getCurrentActiveBitmap()
            if (currentBitmap != null) {
                lifecycleScope.launch(Dispatchers.IO) {
                    val pdfUri = ImageProcessor.exportToPdf(this@MainActivity, currentBitmap, "مدرک اسکن شده")
                    withContext(Dispatchers.Main) {
                        if (pdfUri != null) {
                            Toast.makeText(this@MainActivity, getString(R.string.pdf_saved_success), Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@MainActivity, "خطا در تولید فایل PDF", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }
    }

    // ================= SCREEN NAVIGATION HELPERS =================
    private fun showHomeScreen() {
        binding.homeView.visibility = View.VISIBLE
        binding.cameraView.visibility = View.GONE
        binding.cropView.visibility = View.GONE
        binding.resultOverlay.visibility = View.GONE

        // Update Recent Documents Card on Home
        if (photocopyBitmap != null || dewarpedBitmap != null) {
            binding.layoutRecentDocument.visibility = View.VISIBLE
            binding.txtEmptyRecent.visibility = View.GONE
            binding.imgHomeRecentThumb.setImageBitmap(photocopyBitmap ?: dewarpedBitmap)
        } else {
            binding.layoutRecentDocument.visibility = View.GONE
            binding.txtEmptyRecent.visibility = View.VISIBLE
        }
    }

    private fun openCameraScreen() {
        showCameraScreen()
        cameraManager.startCamera()
    }

    private fun showCameraScreen() {
        binding.homeView.visibility = View.GONE
        binding.cameraView.visibility = View.VISIBLE
        binding.cropView.visibility = View.GONE
        binding.resultOverlay.visibility = View.GONE
    }

    private fun showCropScreen() {
        binding.homeView.visibility = View.GONE
        binding.cameraView.visibility = View.GONE
        binding.cropView.visibility = View.VISIBLE
        binding.resultOverlay.visibility = View.GONE
    }

    private fun showResultScreen() {
        binding.homeView.visibility = View.GONE
        binding.cameraView.visibility = View.GONE
        binding.cropView.visibility = View.GONE
        binding.resultOverlay.visibility = View.VISIBLE
    }

    // ================= DOCUMENT PROCESSING LOGIC =================
    private fun loadBitmapForCropping(uri: Uri, fromGallery: Boolean) {
        isSourceFromGallery = fromGallery
        lifecycleScope.launch(Dispatchers.IO) {
            val bitmap = ImageProcessor.decodeAndRotateBitmap(contentResolver, uri)
            withContext(Dispatchers.Main) {
                if (bitmap != null) {
                    rawCapturedBitmap = bitmap
                    binding.imgCropSource.setImageBitmap(bitmap)
                    binding.cropOverlay.post {
                        binding.cropOverlay.resetToDefault()
                    }
                    showCropScreen()
                } else {
                    Toast.makeText(this@MainActivity, "خطا در بارگذاری تصویر", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun processAndWarpDocument() {
        val src = rawCapturedBitmap ?: return
        binding.btnApplyCrop.isEnabled = false

        val corners = binding.cropOverlay.getNormalizedCorners(src.width, src.height)

        lifecycleScope.launch(Dispatchers.IO) {
            // Step 1: Dewarp / Perspective Rectification
            val warped = ImageProcessor.warpPerspective(src, corners)
            dewarpedBitmap = warped

            // Step 2: High Quality Photocopy & Filters
            val photo = ImageProcessor.toPhotocopy(warped)
            val magic = ImageProcessor.toMagicColor(warped)
            val gray = ImageProcessor.toGrayscale(warped)

            photocopyBitmap = photo
            magicColorBitmap = magic
            grayscaleBitmap = gray

            // Save default photocopy version to uri if available
            lastCapturedUri?.let { uri ->
                ImageProcessor.saveBitmapToUri(contentResolver, uri, photo)
            }

            withContext(Dispatchers.Main) {
                binding.btnApplyCrop.isEnabled = true
                binding.imgResultBW.setImageBitmap(photo)
                binding.imgLastCapture.setImageBitmap(photo)
                activeFilter = "photocopy"
                updateFilterChipsUI("photocopy")
                showResultScreen()
                Toast.makeText(this@MainActivity, getString(R.string.bw_photo_saved), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun recomputeAllFilters(source: Bitmap) {
        binding.progressConverting.visibility = View.VISIBLE
        lifecycleScope.launch(Dispatchers.IO) {
            val photo = ImageProcessor.toPhotocopy(source)
            val magic = ImageProcessor.toMagicColor(source)
            val gray = ImageProcessor.toGrayscale(source)

            photocopyBitmap = photo
            magicColorBitmap = magic
            grayscaleBitmap = gray

            withContext(Dispatchers.Main) {
                binding.progressConverting.visibility = View.GONE
                applyFilterSelection(activeFilter)
            }
        }
    }

    private fun applyFilterSelection(filterName: String) {
        activeFilter = filterName
        val targetBitmap = when (filterName) {
            "photocopy" -> photocopyBitmap ?: dewarpedBitmap
            "magic_color" -> magicColorBitmap ?: dewarpedBitmap
            "grayscale" -> grayscaleBitmap ?: dewarpedBitmap
            else -> dewarpedBitmap
        }

        if (targetBitmap != null) {
            binding.imgResultBW.setImageBitmap(targetBitmap)
            updateFilterChipsUI(filterName)
            lastCapturedUri?.let { uri ->
                lifecycleScope.launch(Dispatchers.IO) {
                    ImageProcessor.saveBitmapToUri(contentResolver, uri, targetBitmap)
                }
            }
        }
    }

    private fun getCurrentActiveBitmap(): Bitmap? {
        return when (activeFilter) {
            "photocopy" -> photocopyBitmap ?: dewarpedBitmap
            "magic_color" -> magicColorBitmap ?: dewarpedBitmap
            "grayscale" -> grayscaleBitmap ?: dewarpedBitmap
            else -> dewarpedBitmap
        }
    }

    private fun updateFilterChipsUI(activeMode: String) {
        binding.btnModePhotocopy.setBackgroundResource(
            if (activeMode == "photocopy") R.drawable.chip_active_bg else R.drawable.chip_inactive_bg
        )
        binding.btnModeMagicColor.setBackgroundResource(
            if (activeMode == "magic_color") R.drawable.chip_active_bg else R.drawable.chip_inactive_bg
        )
        binding.btnModeGrayscale.setBackgroundResource(
            if (activeMode == "grayscale") R.drawable.chip_active_bg else R.drawable.chip_inactive_bg
        )
        binding.btnModeOriginal.setBackgroundResource(
            if (activeMode == "original") R.drawable.chip_active_bg else R.drawable.chip_inactive_bg
        )
    }

    private fun triggerShutterEffect() {
        binding.flashOverlay.visibility = View.VISIBLE
        val anim = AlphaAnimation(0.85f, 0.0f).apply {
            duration = 160
            setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationStart(a: Animation?) {}
                override fun onAnimationEnd(a: Animation?) {
                    binding.flashOverlay.visibility = View.GONE
                }
                override fun onAnimationRepeat(a: Animation?) {}
            })
        }
        binding.flashOverlay.startAnimation(anim)
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraManager.shutdown()
    }
}
