package com.platform.identity.user.api

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:Email
    val email: String,

    @field:Size(min = 8, max = 128)
    val password: String
)
