package com.blindsidedgames.idledysonswarm

import java.nio.charset.StandardCharsets

internal object NativeSaveExport {
    private val fileNamePattern = Regex("idle-dyson-swarm-save(?:-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z)?\\.idsw")

    fun validate(fileName: String?, text: String?) {
        require(fileName != null && fileNamePattern.matches(fileName) && !text.isNullOrEmpty()) {
            "Invalid save export request."
        }
        require(text.toByteArray(StandardCharsets.UTF_8).size <= 32 * 1024 * 1024) {
            "Save export exceeds supported size."
        }
    }
}
