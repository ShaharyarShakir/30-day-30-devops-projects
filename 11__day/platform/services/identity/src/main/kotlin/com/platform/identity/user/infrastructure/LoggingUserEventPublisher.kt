package com.platform.identity.user.infrastructure

import com.platform.identity.user.domain.UserCreatedEvent
import com.platform.identity.user.domain.UserEventPublisher
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class LoggingUserEventPublisher : UserEventPublisher {
    private val log = LoggerFactory.getLogger(LoggingUserEventPublisher::class.java)

    override fun publish(event: UserCreatedEvent) {
        log.info("User created event published: $event")
    }
}
