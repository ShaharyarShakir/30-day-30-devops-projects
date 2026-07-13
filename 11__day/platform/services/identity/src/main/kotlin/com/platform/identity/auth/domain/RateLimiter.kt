package com.platform.identity.auth.domain

interface RateLimiter {
    fun isAllowed(ip: String, email: String): Boolean
    fun recordFailure(ip: String, email: String)
    fun recordSuccess(ip: String, email: String)
}
