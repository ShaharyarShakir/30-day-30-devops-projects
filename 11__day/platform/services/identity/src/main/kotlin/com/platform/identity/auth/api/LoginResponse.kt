package com.platform.identity.auth.api

data class LoginResponse(
    val user: UserResponse
)

data class UserResponse(
    val id: String,
    val email: String,
    val status: String
)
