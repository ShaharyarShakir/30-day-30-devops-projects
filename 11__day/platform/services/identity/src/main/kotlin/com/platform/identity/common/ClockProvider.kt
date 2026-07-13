package com.platform.identity.common

import java.time.Instant

interface ClockProvider {
    fun now(): Instant
}
