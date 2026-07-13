package com.platform.identity.user.api

import java.util.UUID

data class RegisterResponse(
    val id: UUID,
    val email: String,
    val status: String
)
