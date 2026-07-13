package com.platform.identity.common

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class AuditLogger(
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger("AUDIT")

    fun logSuccess(userId: String, ip: String, userAgent: String) {
        val event = mapOf(
            "event" to "login.success",
            "userId" to userId,
            "ip" to ip,
            "userAgent" to userAgent
        )
        log.info(objectMapper.writeValueAsString(event))
    }

    fun logFailure(email: String, ip: String) {
        val event = mapOf(
            "event" to "login.failed",
            "email" to email,
            "ip" to ip
        )
        log.info(objectMapper.writeValueAsString(event))
    }
}
