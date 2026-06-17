// IMPORTANT: this is a SNIPPET, not a standalone file.
// Merge it into your generated android/app/src/main/java/.../MainActivity.kt
//
// Capacitor generates a MainActivity that extends BridgeActivity. To use this
// LOCAL plugin (defined inside the app, not published to npm) you must register
// it before super.onCreate().

package dev.azkar.app // ← use YOUR application id

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Register the local plugin so JS `registerPlugin('OverlayCounter')`
        // resolves to OverlayCounterPlugin.
        registerPlugin(OverlayCounterPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
