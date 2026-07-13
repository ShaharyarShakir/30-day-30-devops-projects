package com.platform.identity.user.domain

interface UserEventPublisher {
    fun publish(event: UserCreatedEvent)
}
