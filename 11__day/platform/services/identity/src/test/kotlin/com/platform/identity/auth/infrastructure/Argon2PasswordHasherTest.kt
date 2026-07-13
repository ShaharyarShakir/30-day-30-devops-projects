package com.platform.identity.auth.infrastructure

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class Argon2PasswordHasherTest {

    private val hasher = Argon2PasswordHasher()

    @Test
    fun `should hash password and verify successfully`() {
        val password = "securePassword123"
        val hash = hasher.hash(password)

        assertTrue(hash.startsWith("\$argon2"))
        assertTrue(hasher.verify(password, hash))
    }
}
