package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.RateLimiter
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Component
@ConditionalOnMissingBean(RateLimiter::class)
class InMemoryRateLimiter : RateLimiter {

    companion object {
        private const val LIMIT = 5
        private const val LOCK_TIME_SECONDS = 900L
    }

    private data class Attempt(val count: Int, val firstFailure: Instant)

    private val ipAttempts = ConcurrentHashMap<String, Attempt>()
    private val emailAttempts = ConcurrentHashMap<String, Attempt>()

    override fun isAllowed(ip: String, email: String): Boolean {
        return isAllowedKey(ip, ipAttempts) && isAllowedKey(email, emailAttempts)
    }

    override fun recordFailure(ip: String, email: String) {
        recordFailureKey(ip, ipAttempts)
        recordFailureKey(email, emailAttempts)
    }

    override fun recordSuccess(ip: String, email: String) {
        ipAttempts.remove(ip)
        emailAttempts.remove(email)
    }

    private fun isAllowedKey(key: String, map: ConcurrentHashMap<String, Attempt>): Boolean {
        val attempt = map[key] ?: return true
        if (Instant.now().isAfter(attempt.firstFailure.plusSeconds(LOCK_TIME_SECONDS))) {
            map.remove(key)
            return true
        }
        return attempt.count < LIMIT
    }

    private fun recordFailureKey(key: String, map: ConcurrentHashMap<String, Attempt>) {
        map.compute(key) { _, current ->
            val now = Instant.now()
            if (current == null || now.isAfter(current.firstFailure.plusSeconds(LOCK_TIME_SECONDS))) {
                Attempt(1, now)
            } else {
                Attempt(current.count + 1, current.firstFailure)
            }
        }
    }
}
