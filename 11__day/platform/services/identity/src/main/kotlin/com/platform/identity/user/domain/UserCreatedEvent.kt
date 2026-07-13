package com.platform.identity.user.domain

import java.util.UUID

data class UserCreatedEvent(
    val id: UUID,
    val email: String
)
