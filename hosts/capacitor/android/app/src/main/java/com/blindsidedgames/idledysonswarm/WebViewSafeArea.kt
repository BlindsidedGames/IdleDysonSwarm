package com.blindsidedgames.idledysonswarm

internal data class SafeAreaEdges(val left: Int, val top: Int, val right: Int, val bottom: Int)

/** System-bar/cutout space still inside the WebView, in physical pixels. */
internal fun webViewSafeArea(
    system: SafeAreaEdges,
    window: SafeAreaEdges,
    webView: SafeAreaEdges,
): SafeAreaEdges = SafeAreaEdges(
    left = (system.left - (webView.left - window.left).coerceAtLeast(0)).coerceAtLeast(0),
    top = (system.top - (webView.top - window.top).coerceAtLeast(0)).coerceAtLeast(0),
    right = (system.right - (window.right - webView.right).coerceAtLeast(0)).coerceAtLeast(0),
    bottom = (system.bottom - (window.bottom - webView.bottom).coerceAtLeast(0)).coerceAtLeast(0),
)
