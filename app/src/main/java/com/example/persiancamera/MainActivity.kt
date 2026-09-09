package com.example.persiancamera

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

    // Permission launcher for Camera & Storage
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val cameraGranted = permissions[android.Manifest.permission.CAMERA] ?: false
        if (cameraGranted) {
            startCamera()
        } else {
            Toast.makeText(
                this,
                getString(R.string.camera_permission_required),
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Force Persian RTL Layout Direction
        ViewCompat.setLayoutDirection(window.decorView, ViewCompat.LAYOUT_DIRECTION_RTL)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraManager = CameraManager(this, this, binding.viewFinder)

        // Handle Back Press to dismiss result overlay
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
        // Shutter Button (ثبت عکس)
        binding.btnCapture.setOnClickListener {
            triggerShutterEffect()
            binding.btnCapture.isEnabled = false

            cameraManager.takePhoto(
                onSuccess = { uri ->
                    lastCapturedUri = uri

                    // Automatic conversion to Black & White (Grayscale)
                    lifecycleScope.launch(Dispatchers.IO) {
                        val bitmap = ImageProcessor.decodeAndRotateBitmap(contentResolver, uri)
                        if (bitmap != null) {
                            val bwBitmap = ImageProcessor.toGrayscale(bitmap)
                            // Overwrite saved file with black and white version
                            ImageProcessor.saveBitmapToUri(contentResolver, uri, bwBitmap)

                            withContext(Dispatchers.Main) {
                                binding.btnCapture.isEnabled = true
                                binding.imgResultBW.setImageBitmap(bwBitmap)
                                binding.imgLastCapture.setImageBitmap(bwBitmap)
                                binding.resultOverlay.visibility = View.VISIBLE

                                Toast.makeText(
                                    this@MainActivity,
                                    getString(R.string.bw_photo_saved),
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        } else {
                            withContext(Dispatchers.Main) {
                                binding.btnCapture.isEnabled = true
                                binding.imgLastCapture.setImageURI(uri)
                                Toast.makeText(
                                    this@MainActivity,
                                    getString(R.string.photo_saved_success),
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        }
                    }
                },
                onError = { exc ->
                    binding.btnCapture.isEnabled = true
                    val errorMsg = getString(R.string.photo_save_failed, exc.message)
                    Toast.makeText(this@MainActivity, errorMsg, Toast.LENGTH_SHORT).show()
                }
            )
        }

        // New Photo Button on Result Screen (گرفتن عکس جدید)
        binding.btnNewPhoto.setOnClickListener {
            binding.resultOverlay.visibility = View.GONE
        }

        // Switch Camera Button (تغییر دوربین)
        binding.btnSwitchCamera.setOnClickListener {
            cameraManager.switchCamera()
        }

        // Flash Toggle Button (حالت فلاش)
        binding.btnFlash.setOnClickListener {
            val status = cameraManager.toggleFlash()
            Toast.makeText(this, "فلاش: $status", Toast.LENGTH_SHORT).show()
        }

        // Thumbnail Click - Opens the captured photo in Gallery
        binding.imgLastCapture.setOnClickListener {
            lastCapturedUri?.let { uri ->
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "image/*")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                try {
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, getString(R.string.saved_in_pictures), Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun startCamera() {
        cameraManager.startCamera(
            onError = { exc ->
                Toast.makeText(this, "خطا در راه‌اندازی دوربین: ${exc.message}", Toast.LENGTH_LONG).show()
            }
        )
    }

    private fun triggerShutterEffect() {
        binding.flashOverlay.visibility = View.VISIBLE
        val fadeAnim = AlphaAnimation(0.8f, 0f).apply {
            duration = 150
            setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationStart(animation: Animation?) {}
                override fun onAnimationEnd(animation: Animation?) {
                    binding.flashOverlay.visibility = View.GONE
                }
                override fun onAnimationRepeat(animation: Animation?) {}
            })
        }
        binding.flashOverlay.startAnimation(fadeAnim)
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraManager.shutdown()
    }
}
