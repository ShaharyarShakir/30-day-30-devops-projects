package com.platform.identity.auth.domain

import java.time.Instant

data class AccessToken(
    val value: String,
    val expiresAt: Instant
)
