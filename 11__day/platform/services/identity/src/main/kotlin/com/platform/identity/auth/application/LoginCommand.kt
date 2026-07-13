package com.platform.identity.auth.application

data class LoginCommand(
    val email: String,
    val password: String,
    val ip: String,
    val userAgent: String
)
