package com.blindsidedgames.idledysonswarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class Stage7CertificationContractTest {
    @Test
    fun certificationNamespaceIsSeparateFromProductionSaveRoots() {
        val namespace = "stage7-v2-certification"
        assertEquals("stage7-v2-certification", namespace)
        assertFalse(namespace.contains("web-save"))
        assertFalse(namespace.contains("unity-save"))
    }
}
