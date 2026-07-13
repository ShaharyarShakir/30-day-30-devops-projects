package com.platform.identity.auth.domain

interface PasswordHasher {
    fun hash(password: String): String
    fun verify(password: String, hash: String): Boolean
}
