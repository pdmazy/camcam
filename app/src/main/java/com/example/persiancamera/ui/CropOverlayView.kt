package com.example.persiancamera.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PointF
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import kotlin.math.hypot

class CropOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    // 4 Corner Points in View coordinate system: Top-Left, Top-Right, Bottom-Right, Bottom-Left
    val corners = arrayOf(
        PointF(100f, 100f),
        PointF(500f, 100f),
        PointF(500f, 700f),
        PointF(100f, 700f)
    )

    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#10B981") // Emerald accent
        strokeWidth = 5f
        style = Paint.Style.STROKE
    }

    private val cornerOuterPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#059669")
        style = Paint.Style.FILL
    }

    private val cornerInnerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }

    private val shadePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#66000000") // Dim outside area
        style = Paint.Style.FILL
    }

    private val path = Path()
    private var draggedCornerIndex: Int = -1
    private val touchRadius = 80f
    private val handleRadius = 24f

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        resetToDefault(w, h)
    }

    fun resetToDefault(w: Int = width, h: Int = height) {
        if (w <= 0 || h <= 0) return
        val marginX = w * 0.08f
        val marginY = h * 0.08f

        corners[0].set(marginX, marginY)             // TL
        corners[1].set(w - marginX, marginY)         // TR
        corners[2].set(w - marginX, h - marginY)     // BR
        corners[3].set(marginX, h - marginY)         // BL
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Draw connecting quad
        path.reset()
        path.moveTo(corners[0].x, corners[0].y)
        path.lineTo(corners[1].x, corners[1].y)
        path.lineTo(corners[2].x, corners[2].y)
        path.lineTo(corners[3].x, corners[3].y)
        path.close()

        // Draw polygon border
        canvas.drawPath(path, linePaint)

        // Draw 4 corner handles
        for (corner in corners) {
            canvas.drawCircle(corner.x, corner.y, handleRadius, cornerOuterPaint)
            canvas.drawCircle(corner.x, corner.y, handleRadius * 0.55f, cornerInnerPaint)
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val x = event.x
        val y = event.y

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                draggedCornerIndex = -1
                var minDist = touchRadius
                for (i in corners.indices) {
                    val dist = hypot((corners[i].x - x).toDouble(), (corners[i].y - y).toDouble()).toFloat()
                    if (dist < minDist) {
                        minDist = dist
                        draggedCornerIndex = i
                    }
                }
                return draggedCornerIndex != -1
            }
            MotionEvent.ACTION_MOVE -> {
                if (draggedCornerIndex in corners.indices) {
                    corners[draggedCornerIndex].x = x.coerceIn(0f, width.toFloat())
                    corners[draggedCornerIndex].y = y.coerceIn(0f, height.toFloat())
                    invalidate()
                    return true
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                draggedCornerIndex = -1
                invalidate()
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    /**
     * Maps View corner coordinates to original bitmap image pixel coordinates
     */
    fun getNormalizedCorners(imageWidth: Int, imageHeight: Int): FloatArray {
        val viewW = width.toFloat().coerceAtLeast(1f)
        val viewH = height.toFloat().coerceAtLeast(1f)

        return floatArrayOf(
            (corners[0].x / viewW) * imageWidth, (corners[0].y / viewH) * imageHeight,
            (corners[1].x / viewW) * imageWidth, (corners[1].y / viewH) * imageHeight,
            (corners[2].x / viewW) * imageWidth, (corners[2].y / viewH) * imageHeight,
            (corners[3].x / viewW) * imageWidth, (corners[3].y / viewH) * imageHeight
        )
    }
}
