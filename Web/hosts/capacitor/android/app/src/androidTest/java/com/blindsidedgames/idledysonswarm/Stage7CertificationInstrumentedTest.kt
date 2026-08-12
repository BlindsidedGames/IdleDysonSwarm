package com.blindsidedgames.idledysonswarm

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import android.webkit.WebView
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Stage7CertificationInstrumentedTest {
    @Test
    fun flaggedDebugPackageContainsTheSeparateCertificationEntry() {
        assumeTrue(BuildConfig.STAGE7_V2_CERTIFICATION)
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.blindsidedgames.idledysonswarm.stage7certification", context.packageName)
        val assets = context.assets.list("")?.toSet().orEmpty()
        assertTrue(assets.contains("public"))
        val entry = context.assets.open("public/index.html")
            .bufferedReader().use { it.readText() }
        assertTrue(entry.contains("Device certification"))
        assertTrue(entry.contains("type=\"module\""))
    }

    @Test
    fun launchesTheRealWebViewAndCompletesRepositoryWorkerAndLifecycleSmokes() {
        assumeTrue(BuildConfig.STAGE7_V2_CERTIFICATION)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            waitForJavascript(scenario, "document.querySelector('h1')?.textContent") {
                it.contains("Device certification")
            }
            javascript(scenario, "Capacitor.Plugins.IdleDysonNative.certificationDeviceContext().then(value=>globalThis.__stage7DeviceContext=value); 'requested'")
            waitForJavascript(scenario, "JSON.stringify(globalThis.__stage7DeviceContext ?? null)") {
                it.contains("android-api") && it.contains("physicalDevice") && it.contains("deviceModel")
            }
            val initial = javascript(scenario, "String(document.querySelectorAll('button').length)")
            assertEquals("1", initial)
            javascript(scenario, "document.querySelector('button')?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Checkpoint/readback passed")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Developer Options'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Developer Options committed") && it.contains("shards 1e5->0") && it.contains("matter 5e5->0")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('selected policy'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Worker smoke completed") && it.contains("Raw automation ticks4100")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('pause and return'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Long-offline lifecycle ready; 42000000 seconds")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('1e1000'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Extreme 1e1000 import ready")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('selected policy'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Worker smoke completed") && it.contains("money 1e1000")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('corrupt-envelope'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Corrupt envelope rejected")
            }
            javascript(scenario, "[...document.querySelectorAll('button')].find(b=>b.textContent.includes('forward-schema'))?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Valid envelope with forward-schema save rejected")
            }
            scenario.recreate()
            waitForJavascript(scenario, "document.querySelector('h1')?.textContent") {
                it.contains("Device certification")
            }
            javascript(scenario, "document.querySelector('button')?.click(); 'clicked'")
            waitForJavascript(scenario, "document.body.textContent") {
                it.contains("Checkpoint/readback passed at durable revision")
            }
        }
    }

    private fun waitForJavascript(
        scenario: ActivityScenario<MainActivity>,
        expression: String,
        predicate: (String) -> Boolean,
    ) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30)
        while (System.nanoTime() < deadline) {
            if (predicate(javascript(scenario, expression))) return
            Thread.sleep(100)
        }
        throw AssertionError("Timed out waiting for certification WebView: $expression")
    }

    private fun javascript(scenario: ActivityScenario<MainActivity>, expression: String): String {
        val latch = CountDownLatch(1)
        var result = ""
        scenario.onActivity { activity ->
            val webView = activity.findViewById<WebView>(com.getcapacitor.android.R.id.webview)
            webView.evaluateJavascript("String($expression)") { value ->
                result = value.removeSurrounding("\"")
                latch.countDown()
            }
        }
        assertTrue(latch.await(5, TimeUnit.SECONDS))
        return result
    }
}
