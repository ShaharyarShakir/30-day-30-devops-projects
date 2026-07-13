package com.platform.identity.common.infrastructure

import com.platform.identity.common.ClockProvider
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class SystemClockProvider : ClockProvider {
    override fun now(): Instant = Instant.now()
}
