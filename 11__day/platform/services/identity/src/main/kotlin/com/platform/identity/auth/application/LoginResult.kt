package com.platform.identity.auth.application

import com.platform.identity.user.domain.User

data class LoginResult(
    val accessToken: String,
    val refreshToken: String,
    val user: User
)
