package com.example.persiancamera

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import com.example.persiancamera.camera.CameraManager
import com.example.persiancamera.databinding.ActivityMainBinding
import com.example.persiancamera.util.PermissionUtils

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
                    binding.btnCapture.isEnabled = true
                    lastCapturedUri = uri
                    binding.imgLastCapture.setImageURI(uri)

                    Toast.makeText(
                        this@MainActivity,
                        getString(R.string.photo_saved_success),
                        Toast.LENGTH_SHORT
                    ).show()
                },
                onError = { exc ->
                    binding.btnCapture.isEnabled = true
                    val errorMsg = getString(R.string.photo_save_failed, exc.message)
                    Toast.makeText(this@MainActivity, errorMsg, Toast.LENGTH_SHORT).show()
                }
            )
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
