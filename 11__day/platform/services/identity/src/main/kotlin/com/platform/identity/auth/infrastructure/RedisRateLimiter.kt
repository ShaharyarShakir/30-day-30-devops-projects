package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.RateLimiter
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.util.concurrent.TimeUnit

@Component
@ConditionalOnProperty(name = ["app.rate-limiter.type"], havingValue = "redis", matchIfMissing = true)
class RedisRateLimiter(
    private val redisTemplate: StringRedisTemplate
) : RateLimiter {

    companion object {
        private const val ATTEMPTS_PREFIX = "login:attempts"
        private const val LIMIT = 5
        private const val LOCK_TIME_MINUTES = 15L
    }

    override fun isAllowed(ip: String, email: String): Boolean {
        val ipAttempts = getAttempts(ipKey(ip))
        val emailAttempts = getAttempts(emailKey(email))
        return ipAttempts < LIMIT && emailAttempts < LIMIT
    }

    override fun recordFailure(ip: String, email: String) {
        incrementAttempts(ipKey(ip))
        incrementAttempts(emailKey(email))
    }

    override fun recordSuccess(ip: String, email: String) {
        redisTemplate.delete(ipKey(ip))
        redisTemplate.delete(emailKey(email))
    }

    private fun ipKey(ip: String) = "$ATTEMPTS_PREFIX:ip:$ip"
    private fun emailKey(email: String) = "$ATTEMPTS_PREFIX:email:$email"

    private fun getAttempts(key: String): Int {
        val valStr = redisTemplate.opsForValue().get(key)
        return valStr?.toIntOrNull() ?: 0
    }

    private fun incrementAttempts(key: String) {
        val attempts = redisTemplate.opsForValue().increment(key) ?: 1
        if (attempts == 1L) {
            redisTemplate.expire(key, LOCK_TIME_MINUTES, TimeUnit.MINUTES)
        }
    }
}
