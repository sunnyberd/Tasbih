// IMPORTANT: change this package to YOUR application id, e.g. `package dev.azkar.app`
package dev.azkar.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge for the native "counter over everything" overlay.
 *
 * The JS side registers this with `registerPlugin('OverlayCounter')`, so the
 * `name` below MUST stay "OverlayCounter".
 *
 * This plugin only talks to [OverlayCounterService]; the actual window is drawn
 * there. The plugin also exposes itself via a process-wide reference so the
 * service can push `increment` / `overlayClosed` events back to JS.
 */
@CapacitorPlugin(name = "OverlayCounter")
class OverlayCounterPlugin : Plugin() {

    companion object {
        /** Set while the plugin is loaded so the service can emit events to JS. */
        @Volatile
        var instance: OverlayCounterPlugin? = null
    }

    override fun load() {
        super.load()
        instance = this
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        if (instance === this) instance = null
    }

    // ---- Permission ---------------------------------------------------------

    private fun canDrawOverlays(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true // pre-M: granted at install time
        }
    }

    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val res = JSObject()
        res.put("granted", canDrawOverlays())
        call.resolve(res)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (canDrawOverlays()) {
            val res = JSObject()
            res.put("granted", true)
            call.resolve(res)
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Opens the system "Display over other apps" settings for this app.
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName),
            )
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
        // The actual grant happens in system settings; report current state.
        val res = JSObject()
        res.put("granted", canDrawOverlays())
        call.resolve(res)
    }

    // ---- Overlay control ----------------------------------------------------

    @PluginMethod
    fun show(call: PluginCall) {
        if (!canDrawOverlays()) {
            call.reject("OVERLAY_PERMISSION_DENIED")
            return
        }
        val intent = Intent(context, OverlayCounterService::class.java).apply {
            action = OverlayCounterService.ACTION_SHOW
            putExtra(OverlayCounterService.EXTRA_COUNT, call.getInt("count", 0)!!)
            putExtra(OverlayCounterService.EXTRA_GOAL, call.getInt("goal", 0)!!)
            putExtra(OverlayCounterService.EXTRA_LABEL, call.getString("label", "") ?: "")
            putExtra(OverlayCounterService.EXTRA_ACCENT, call.getString("accentColor", "#d4af37"))
            putExtra(OverlayCounterService.EXTRA_BG, call.getString("bgColor", "#111111"))
        }
        startServiceCompat(intent)
        call.resolve()
    }

    @PluginMethod
    fun update(call: PluginCall) {
        val intent = Intent(context, OverlayCounterService::class.java).apply {
            action = OverlayCounterService.ACTION_UPDATE
            putExtra(OverlayCounterService.EXTRA_COUNT, call.getInt("count", 0)!!)
            putExtra(OverlayCounterService.EXTRA_GOAL, call.getInt("goal", 0)!!)
        }
        startServiceCompat(intent)
        call.resolve()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        val intent = Intent(context, OverlayCounterService::class.java).apply {
            action = OverlayCounterService.ACTION_HIDE
        }
        context.startService(intent)
        call.resolve()
    }

    @PluginMethod
    fun isShowing(call: PluginCall) {
        val res = JSObject()
        res.put("showing", OverlayCounterService.isRunning)
        call.resolve(res)
    }

    private fun startServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    // ---- Events from the service -> JS --------------------------------------

    /** Called by the service when the user taps the overlay button. */
    fun emitIncrement(count: Int) {
        val data = JSObject()
        data.put("count", count)
        notifyListeners("increment", data)
    }

    /** Called by the service when the overlay is dismissed. */
    fun emitClosed() {
        notifyListeners("overlayClosed", JSObject())
    }
}
