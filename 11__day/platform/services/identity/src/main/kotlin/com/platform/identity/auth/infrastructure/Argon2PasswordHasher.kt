package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.PasswordHasher
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.stereotype.Component

@Component
class Argon2PasswordHasher : PasswordHasher {
    private val encoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()

    override fun hash(password: String): String =
        encoder.encode(password)

    override fun verify(password: String, hash: String): Boolean =
        encoder.matches(password, hash)
}
