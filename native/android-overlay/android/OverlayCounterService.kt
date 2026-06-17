// IMPORTANT: change this package to YOUR application id, e.g. `package dev.azkar.app`
package dev.azkar.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs

/**
 * Foreground service that draws a draggable circular counter on top of other
 * apps using SYSTEM_ALERT_WINDOW + WindowManager.
 *
 * Controlled by [OverlayCounterPlugin] via Intents (SHOW / UPDATE / HIDE).
 * On tap it increments locally and reports back to JS through the plugin.
 *
 * ── NO-FOREGROUND-SERVICE VARIANT ────────────────────────────────────────────
 * If you do not want a foreground service (e.g. to avoid the Android 14
 * foregroundServiceType justification), you can:
 *   1. remove startForeground()/notification code,
 *   2. remove the <service android:foregroundServiceType=.../> attribute,
 *   3. keep adding the view to WindowManager directly.
 * The overlay still works while the app process is alive; a foreground service
 * just makes it more resilient when the app is backgrounded.
 */
class OverlayCounterService : Service() {

    companion object {
        const val ACTION_SHOW = "azkar.overlay.SHOW"
        const val ACTION_UPDATE = "azkar.overlay.UPDATE"
        const val ACTION_HIDE = "azkar.overlay.HIDE"

        const val EXTRA_COUNT = "count"
        const val EXTRA_GOAL = "goal"
        const val EXTRA_LABEL = "label"
        const val EXTRA_ACCENT = "accent"
        const val EXTRA_BG = "bg"

        @Volatile
        var isRunning = false
            private set

        private const val CHANNEL_ID = "azkar_overlay"
        private const val NOTIF_ID = 4711
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    private var numView: TextView? = null
    private var labelView: TextView? = null
    private var closeView: TextView? = null

    private var count = 0
    private var goal = 0
    private var accent = "#d4af37"
    private var bg = "#111111"
    private var label = ""

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                count = intent.getIntExtra(EXTRA_COUNT, 0)
                goal = intent.getIntExtra(EXTRA_GOAL, 0)
                label = intent.getStringExtra(EXTRA_LABEL) ?: ""
                accent = intent.getStringExtra(EXTRA_ACCENT) ?: "#d4af37"
                bg = intent.getStringExtra(EXTRA_BG) ?: "#111111"
                startForegroundIfNeeded()
                showOverlay()
            }
            ACTION_UPDATE -> {
                count = intent.getIntExtra(EXTRA_COUNT, count)
                goal = intent.getIntExtra(EXTRA_GOAL, goal)
                renderCount()
            }
            ACTION_HIDE -> {
                removeOverlay()
                stopSelf()
            }
        }
        return START_STICKY
    }

    // ---- Overlay view -------------------------------------------------------

    private fun dp(value: Float): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics).toInt()

    private fun safeColor(hex: String, fallback: Int): Int =
        try { Color.parseColor(hex) } catch (e: Exception) { fallback }

    private fun showOverlay() {
        if (overlayView != null) {
            renderCount()
            return
        }
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val accentColor = safeColor(accent, Color.parseColor("#d4af37"))
        val bgColor = safeColor(bg, Color.parseColor("#111111"))

        // Container (circle) ----------------------------------------------------
        val container = FrameLayout(this)
        val circle = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(bgColor)
            setStroke(dp(1.5f), accentColor)
        }
        container.background = circle
        val size = dp(64f)

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }

        numView = TextView(this).apply {
            text = count.toString()
            setTextColor(accentColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            gravity = Gravity.CENTER
        }
        labelView = TextView(this).apply {
            text = if (goal > 0) "/ $goal" else label
            setTextColor(Color.parseColor("#99FFFFFF"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 8f)
            gravity = Gravity.CENTER
        }
        content.addView(numView)
        content.addView(labelView)
        container.addView(
            content,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ).apply { gravity = Gravity.CENTER },
        )

        // Small close affordance in the corner -----------------------------------
        closeView = TextView(this).apply {
            text = "×"
            setTextColor(accentColor)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
            setOnClickListener {
                removeOverlay()
                OverlayCounterPlugin.instance?.emitClosed()
                stopSelf()
            }
        }
        container.addView(
            closeView,
            FrameLayout.LayoutParams(dp(18f), dp(18f)).apply { gravity = Gravity.TOP or Gravity.END },
        )

        overlayView = container

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        layoutParams = WindowManager.LayoutParams(
            size,
            size,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - size - dp(12f)
            y = resources.displayMetrics.heightPixels / 2
        }

        attachDragAndTap(container)

        try {
            windowManager?.addView(overlayView, layoutParams)
            isRunning = true
        } catch (e: Exception) {
            overlayView = null
            isRunning = false
        }
    }

    private fun renderCount() {
        numView?.text = count.toString()
        labelView?.text = if (goal > 0) "/ $goal" else label
        numView?.let {
            it.animate().scaleX(1.18f).scaleY(1.18f).setDuration(80).withEndAction {
                it.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
            }.start()
        }
    }

    private fun removeOverlay() {
        try {
            overlayView?.let { windowManager?.removeView(it) }
        } catch (e: Exception) {
            // already removed
        }
        overlayView = null
        isRunning = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    // ---- Drag vs tap --------------------------------------------------------

    private fun attachDragAndTap(view: View) {
        var initialX = 0
        var initialY = 0
        var touchX = 0f
        var touchY = 0f
        var moved = false
        val touchSlop = dp(8f).toFloat()

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams?.x ?: 0
                    initialY = layoutParams?.y ?: 0
                    touchX = event.rawX
                    touchY = event.rawY
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - touchX).toInt()
                    val dy = (event.rawY - touchY).toInt()
                    if (abs(dx) > touchSlop || abs(dy) > touchSlop) moved = true
                    layoutParams?.x = initialX + dx
                    layoutParams?.y = initialY + dy
                    try {
                        windowManager?.updateViewLayout(overlayView, layoutParams)
                    } catch (e: Exception) {
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) {
                        // Tap = +1
                        count += 1
                        renderCount()
                        OverlayCounterPlugin.instance?.emitIncrement(count)
                    } else {
                        snapToEdge()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun snapToEdge() {
        val lp = layoutParams ?: return
        val screenW = resources.displayMetrics.widthPixels
        val viewW = overlayView?.width ?: dp(64f)
        lp.x = if (lp.x + viewW / 2 < screenW / 2) dp(12f) else screenW - viewW - dp(12f)
        try {
            windowManager?.updateViewLayout(overlayView, lp)
        } catch (e: Exception) {
        }
    }

    // ---- Foreground service plumbing ---------------------------------------

    private fun startForegroundIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Azkar overlay counter",
                NotificationManager.IMPORTANCE_MIN,
            ).apply { setShowBadge(false) }
            nm.createNotificationChannel(channel)
        }
        val notification: Notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Azkar")
            .setContentText("Счётчик поверх всего активен")
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .build()

        // On Android 14 (API 34) the type must be declared in the manifest too.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIF_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
    }
}
