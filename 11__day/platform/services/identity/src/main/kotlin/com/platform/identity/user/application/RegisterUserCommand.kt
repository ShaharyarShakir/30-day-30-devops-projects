package com.platform.identity.user.application

data class RegisterUserCommand(
    val email: String,
    val password: String
)
