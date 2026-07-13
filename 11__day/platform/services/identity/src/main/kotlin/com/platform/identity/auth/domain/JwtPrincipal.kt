package com.platform.identity.auth.domain

import java.util.UUID

data class JwtPrincipal(
    val userId: UUID,
    val email: String,
    val roles: Set<String>
)
