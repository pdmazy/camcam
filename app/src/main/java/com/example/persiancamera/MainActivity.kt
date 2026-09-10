package com.example.persiancamera

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.Button
import android.widget.ImageButton
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.lifecycle.lifecycleScope
import com.example.persiancamera.camera.CameraManager
import com.example.persiancamera.databinding.ActivityMainBinding
import com.example.persiancamera.print.LayoutMode
import com.example.persiancamera.print.Orientation
import com.example.persiancamera.print.PageSize
import com.example.persiancamera.print.PrintLayoutManager
import com.example.persiancamera.print.PrintSettings
import com.example.persiancamera.storage.PhotoStorageManager
import com.example.persiancamera.util.ImageProcessor
import com.example.persiancamera.util.PermissionUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraManager: CameraManager
    private lateinit var storageManager: PhotoStorageManager
    private lateinit var printLayoutManager: PrintLayoutManager

    // Current working bitmaps
    private var rawCapturedBitmap: Bitmap? = null
    private var dewarpedBitmap: Bitmap? = null
    private var photocopyBitmap: Bitmap? = null
    private var magicColorBitmap: Bitmap? = null
    private var grayscaleBitmap: Bitmap? = null
    private var secondaryDocBitmap: Bitmap? = null
    private var currentSheetBitmap: Bitmap? = null

    private var activeFilter = "photocopy"
    private var lastCapturedUri: Uri? = null
    private var lastGallerySavedUri: Uri? = null

    // Print and sheet dimensions configuration
    private val printSettings = PrintSettings(
        pageSize = PageSize.A4,
        orientation = Orientation.PORTRAIT,
        layoutMode = LayoutMode.SINGLE_PAGE,
        marginMm = 10f,
        autoRotateLandscape = true
    )

    // Track if current crop came from gallery or camera
    private var isSourceFromGallery = false
    private var isCapturingBackSide = false

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

    // Gallery picker for secondary photo (2-in-1 back of document)
    private val secondaryGalleryLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            loadSecondaryBitmap(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Force Persian RTL Layout Direction
        ViewCompat.setLayoutDirection(window.decorView, ViewCompat.LAYOUT_DIRECTION_RTL)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraManager = CameraManager(this, this, binding.viewFinder)
        storageManager = PhotoStorageManager(this)
        printLayoutManager = PrintLayoutManager(this)

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
            isCapturingBackSide = false
            if (PermissionUtils.hasPermissions(this)) {
                openCameraScreen()
            } else {
                requestPermissionLauncher.launch(PermissionUtils.REQUIRED_PERMISSIONS)
            }
        }

        binding.btnHomePickGallery.setOnClickListener {
            isCapturingBackSide = false
            galleryLauncher.launch("image/*")
        }

        binding.btnHomeOpenRecent.setOnClickListener {
            if (currentSheetBitmap != null || photocopyBitmap != null || dewarpedBitmap != null) {
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
            if (currentSheetBitmap != null || photocopyBitmap != null) {
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
            rawCapturedBitmap?.let { bmp ->
                val detectedCorners = ImageProcessor.detectDocumentCorners(bmp)
                binding.cropOverlay.setDetectedCorners(detectedCorners, bmp.width, bmp.height)
                Toast.makeText(this, "✨ لبه‌های مدرک به‌طور هوشمند شناسایی شد", Toast.LENGTH_SHORT).show()
            } ?: run {
                binding.cropOverlay.resetToDefault()
            }
        }

        binding.btnApplyCrop.setOnClickListener {
            processAndWarpDocument()
        }

        // ================= RESULT SCREEN LISTENERS =================
        binding.btnResultHome.setOnClickListener {
            showHomeScreen()
        }

        binding.btnNewPhoto.setOnClickListener {
            isCapturingBackSide = false
            openCameraScreen()
        }

        // Quick Paper Buttons on Result View (Strictly A4 and A5)
        binding.btnPaperA4.setOnClickListener {
            updatePaperMode(PageSize.A4, LayoutMode.SINGLE_PAGE)
            renderAndDisplaySheet()
        }
        binding.btnPaperA5.setOnClickListener {
            updatePaperMode(PageSize.A5, LayoutMode.SINGLE_PAGE)
            renderAndDisplaySheet()
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

        // SAVE DIRECTLY TO GALLERY (JPEG)
        binding.btnSaveToGallery.setOnClickListener {
            val sheetToSave = currentSheetBitmap ?: getCurrentActiveBitmap()
            if (sheetToSave != null) {
                lifecycleScope.launch(Dispatchers.IO) {
                    val savedUri = storageManager.saveBitmapToGallery(sheetToSave, "PHOTOCOPY_SCAN")
                    withContext(Dispatchers.Main) {
                        if (savedUri != null) {
                            lastGallerySavedUri = savedUri
                            binding.btnSaveToGallery.text = getString(R.string.btn_save_to_gallery_saved)
                            Toast.makeText(this@MainActivity, getString(R.string.toast_saved_to_gallery), Toast.LENGTH_LONG).show()

                            // Restore button label after 3 seconds
                            binding.btnSaveToGallery.postDelayed({
                                binding.btnSaveToGallery.text = getString(R.string.btn_save_to_gallery)
                            }, 3000)
                        } else {
                            Toast.makeText(this@MainActivity, "خطا در ذخیره‌سازی گالری", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        // Open Print Settings Dialog
        binding.btnOpenPrintSettings.setOnClickListener {
            showPrintSettingsDialog()
        }
        binding.btnPaperSettings.setOnClickListener {
            showPrintSettingsDialog()
        }

        // Share Document
        binding.btnShareDoc.setOnClickListener {
            val uriToShare = lastGallerySavedUri ?: lastCapturedUri
            if (uriToShare != null) {
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "image/jpeg"
                    putExtra(Intent.EXTRA_STREAM, uriToShare)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(shareIntent, "اشتراک‌گذاری مدرک اسکن شده"))
            } else {
                // First save to gallery then share
                val sheet = currentSheetBitmap ?: getCurrentActiveBitmap()
                if (sheet != null) {
                    lifecycleScope.launch(Dispatchers.IO) {
                        val saved = storageManager.saveBitmapToGallery(sheet, "TEMP_SHARE")
                        withContext(Dispatchers.Main) {
                            if (saved != null) {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "image/jpeg"
                                    putExtra(Intent.EXTRA_STREAM, saved)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                startActivity(Intent.createChooser(shareIntent, "اشتراک‌گذاری مدرک"))
                            }
                        }
                    }
                }
            }
        }

        // Export PDF
        binding.btnExportPdf.setOnClickListener {
            val sheet = currentSheetBitmap ?: getCurrentActiveBitmap()
            if (sheet != null) {
                lifecycleScope.launch(Dispatchers.IO) {
                    val pdfUri = printLayoutManager.exportToPdfUri(sheet, "Scan_${System.currentTimeMillis()}")
                    withContext(Dispatchers.Main) {
                        if (pdfUri != null) {
                            Toast.makeText(this@MainActivity, getString(R.string.pdf_saved_success), Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(this@MainActivity, "خطا در صدور فایل PDF", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }
    }

    private fun updatePaperMode(pageSize: PageSize, layoutMode: LayoutMode = LayoutMode.SINGLE_PAGE) {
        printSettings.pageSize = pageSize
        printSettings.layoutMode = layoutMode

        // Ensure orientation strictly follows the active document's natural orientation!
        val activeDoc = getCurrentActiveBitmap()
        if (activeDoc != null) {
            printSettings.orientation = if (activeDoc.width > activeDoc.height) Orientation.LANDSCAPE else Orientation.PORTRAIT
        }

        // Update UI Button Styles for Result view (Strictly A4 and A5)
        val isA4 = pageSize == PageSize.A4
        val isA5 = pageSize == PageSize.A5

        binding.btnPaperA4.setBackgroundResource(if (isA4) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
        binding.btnPaperA4.setTextColor(resources.getColor(if (isA4) R.color.emerald_600 else R.color.on_surface_variant))

        binding.btnPaperA5.setBackgroundResource(if (isA5) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
        binding.btnPaperA5.setTextColor(resources.getColor(if (isA5) R.color.emerald_600 else R.color.on_surface_variant))

        // Badge update
        val orientationText = if (printSettings.orientation == Orientation.PORTRAIT) "عمودی" else "افقی"
        binding.txtPaperBadge.text = if (isA5) "برگه A5 نیم‌صفحه • $orientationText" else "برگه A4 اداری • $orientationText"
    }

    // ================= PRINT SETTINGS DIALOG =================
    private fun showPrintSettingsDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_print_settings, null)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        val dlgBtnA4 = dialogView.findViewById<Button>(R.id.dlgBtnA4)
        val dlgBtnA5 = dialogView.findViewById<Button>(R.id.dlgBtnA5)
        val dlgBtnPortrait = dialogView.findViewById<Button>(R.id.dlgBtnPortrait)
        val dlgBtnLandscape = dialogView.findViewById<Button>(R.id.dlgBtnLandscape)
        val btnClose = dialogView.findViewById<ImageButton>(R.id.btnCloseDialog)
        val btnApply = dialogView.findViewById<Button>(R.id.dlgBtnApply)

        fun refreshDialogButtons() {
            val isA4 = printSettings.pageSize == PageSize.A4
            val isA5 = printSettings.pageSize == PageSize.A5

            dlgBtnA4.setBackgroundResource(if (isA4) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
            dlgBtnA4.setTextColor(resources.getColor(if (isA4) R.color.emerald_600 else R.color.on_surface_variant))

            dlgBtnA5.setBackgroundResource(if (isA5) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
            dlgBtnA5.setTextColor(resources.getColor(if (isA5) R.color.emerald_600 else R.color.on_surface_variant))

            val isPort = printSettings.orientation == Orientation.PORTRAIT
            dlgBtnPortrait.setBackgroundResource(if (isPort) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
            dlgBtnPortrait.setTextColor(resources.getColor(if (isPort) R.color.emerald_600 else R.color.on_surface_variant))

            dlgBtnLandscape.setBackgroundResource(if (!isPort) R.drawable.chip_active_bg else R.drawable.chip_inactive_bg)
            dlgBtnLandscape.setTextColor(resources.getColor(if (!isPort) R.color.emerald_600 else R.color.on_surface_variant))
        }

        refreshDialogButtons()

        dlgBtnA4.setOnClickListener {
            printSettings.pageSize = PageSize.A4
            printSettings.layoutMode = LayoutMode.SINGLE_PAGE
            refreshDialogButtons()
        }
        dlgBtnA5.setOnClickListener {
            printSettings.pageSize = PageSize.A5
            printSettings.layoutMode = LayoutMode.SINGLE_PAGE
            refreshDialogButtons()
        }

        dlgBtnPortrait.setOnClickListener {
            printSettings.orientation = Orientation.PORTRAIT
            refreshDialogButtons()
        }
        dlgBtnLandscape.setOnClickListener {
            printSettings.orientation = Orientation.LANDSCAPE
            refreshDialogButtons()
        }

        btnClose.setOnClickListener { dialog.dismiss() }
        btnApply.setOnClickListener {
            dialog.dismiss()
            updatePaperMode(printSettings.pageSize, printSettings.layoutMode)
            renderAndDisplaySheet()
        }

        dialog.show()
    }

    // ================= DOCUMENT SHEET RENDERING =================
    private fun renderAndDisplaySheet() {
        val currentDoc = getCurrentActiveBitmap() ?: return
        binding.progressConverting.visibility = View.VISIBLE

        lifecycleScope.launch(Dispatchers.Default) {
            val sheet = printLayoutManager.renderDocumentSheet(
                frontDoc = currentDoc,
                backDoc = secondaryDocBitmap,
                settings = printSettings,
                dpi = 150
            )
            currentSheetBitmap = sheet

            withContext(Dispatchers.Main) {
                binding.progressConverting.visibility = View.GONE
                binding.imgResultBW.setImageBitmap(sheet)
                binding.imgLastCapture.setImageBitmap(sheet)
                binding.imgHomeRecentThumb.setImageBitmap(sheet)
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
        val recentBmp = currentSheetBitmap ?: photocopyBitmap ?: dewarpedBitmap
        if (recentBmp != null) {
            binding.layoutRecentDocument.visibility = View.VISIBLE
            binding.txtEmptyRecent.visibility = View.GONE
            binding.imgHomeRecentThumb.setImageBitmap(recentBmp)
            binding.txtRecentFormatInfo.text = "برگه آماده • " + binding.txtPaperBadge.text
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
                        val detectedCorners = ImageProcessor.detectDocumentCorners(bitmap)
                        binding.cropOverlay.setDetectedCorners(detectedCorners, bitmap.width, bitmap.height)
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

            // Strictly preserve the document's natural orientation:
            // Horizontal document (width > height) stays horizontal!
            // Vertical document (height >= width) stays vertical!
            printSettings.orientation = if (warped.width > warped.height) Orientation.LANDSCAPE else Orientation.PORTRAIT

            // Step 2: High Quality Photocopy & Filters
            val photo = ImageProcessor.toPhotocopy(warped)
            val magic = ImageProcessor.toMagicColor(warped)
            val gray = ImageProcessor.toGrayscale(warped)

            photocopyBitmap = photo
            magicColorBitmap = magic
            grayscaleBitmap = gray

            withContext(Dispatchers.Main) {
                binding.btnApplyCrop.isEnabled = true
                activeFilter = "photocopy"
                updateFilterChipsUI("photocopy")
                updatePaperMode(printSettings.pageSize, LayoutMode.SINGLE_PAGE)
                showResultScreen()
                renderAndDisplaySheet()
                Toast.makeText(this@MainActivity, getString(R.string.bw_photo_saved), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun recomputeAllFilters(source: Bitmap) {
        printSettings.orientation = if (source.width > source.height) Orientation.LANDSCAPE else Orientation.PORTRAIT
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
                updatePaperMode(printSettings.pageSize, LayoutMode.SINGLE_PAGE)
                renderAndDisplaySheet()
            }
        }
    }

    private fun applyFilterSelection(filterName: String) {
        activeFilter = filterName
        updateFilterChipsUI(filterName)
        renderAndDisplaySheet()
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
