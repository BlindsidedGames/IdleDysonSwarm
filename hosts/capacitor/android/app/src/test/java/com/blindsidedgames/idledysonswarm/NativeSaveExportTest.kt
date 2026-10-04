package com.blindsidedgames.idledysonswarm

import org.junit.Assert.assertThrows
import org.junit.Test

class NativeSaveExportTest {
    @Test fun acceptsFixedAndTimestampedFilenames() {
        NativeSaveExport.validate("idle-dyson-swarm-save.idsw", "IDSWEB1:café\n")
        NativeSaveExport.validate("idle-dyson-swarm-save-2026-10-04T12-00-00-000Z.idsw", "IDSWEB1:café\n")
    }
    @Test fun rejectsUnsafeNamesWithOtherwiseValidPayloads() {
        for (name in listOf("../idle-dyson-swarm-save.idsw", "idle-dyson-swarm-save.idsw\n", "save.exe", "idle-dyson-swarm-save-random.idsw")) {
            assertThrows(IllegalArgumentException::class.java) { NativeSaveExport.validate(name, "valid-payload") }
        }
    }
    @Test fun boundsUtf8BytesAndRejectsEmptyPayload() {
        assertThrows(IllegalArgumentException::class.java) { NativeSaveExport.validate("idle-dyson-swarm-save.idsw", "") }
        assertThrows(IllegalArgumentException::class.java) { NativeSaveExport.validate("idle-dyson-swarm-save.idsw", "é".repeat(16 * 1024 * 1024 + 1)) }
    }
}
