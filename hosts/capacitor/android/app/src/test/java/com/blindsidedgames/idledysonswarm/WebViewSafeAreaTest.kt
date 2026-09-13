package com.blindsidedgames.idledysonswarm

import org.junit.Assert.assertEquals
import org.junit.Test

class WebViewSafeAreaTest {
    private val portrait = SafeAreaEdges(0, 0, 1080, 2400)
    private val bars = SafeAreaEdges(0, 136, 0, 63)

    @Test fun edgeToEdgeKeepsSystemInsets() {
        assertEquals(bars, webViewSafeArea(bars, portrait, portrait))
    }

    @Test fun nativePaddingAlreadyProtectsPortraitControls() {
        assertEquals(SafeAreaEdges(0, 0, 0, 0), webViewSafeArea(
            bars, portrait, SafeAreaEdges(0, 136, 1080, 2337),
        ))
    }

    @Test fun partialPaddingKeepsOnlyTheRemainingOverlap() {
        assertEquals(SafeAreaEdges(0, 36, 0, 43), webViewSafeArea(
            bars, portrait, SafeAreaEdges(0, 100, 1080, 2380),
        ))
    }

    @Test fun landscapeCutoutAndButtonNavigationAreIndependent() {
        assertEquals(SafeAreaEdges(0, 0, 126, 0), webViewSafeArea(
            SafeAreaEdges(136, 74, 126, 0),
            SafeAreaEdges(0, 0, 2400, 1080),
            SafeAreaEdges(136, 74, 2400, 1080),
        ))
    }

    @Test fun keyboardAndNonzeroWindowOriginDoNotCreateNegativeInsets() {
        assertEquals(SafeAreaEdges(0, 0, 0, 0), webViewSafeArea(
            bars, SafeAreaEdges(20, 40, 1100, 2440), SafeAreaEdges(20, 176, 1100, 1500),
        ))
    }
}
