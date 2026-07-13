package com.platform.identity.user.domain

class EmailAlreadyExistsException(email: String) :
    RuntimeException("Email already exists: $email")
