package com.platform.identity.auth.application

import com.platform.identity.auth.domain.*
import com.platform.identity.common.AuditLogger
import com.platform.identity.common.ClockProvider
import com.platform.identity.user.domain.UserRepository
import com.platform.identity.user.domain.UserStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest

@Service
class LoginUseCase(
    private val userRepository: UserRepository,
    private val passwordHasher: PasswordHasher,
    private val tokenService: TokenService,
    private val refreshRepository: RefreshTokenRepository,
    private val rateLimiter: RateLimiter,
    private val auditLogger: AuditLogger,
    private val clock: ClockProvider
) {

    @Transactional
    fun execute(command: LoginCommand): LoginResult {
        val normalizedEmail = command.email.trim().lowercase()

        if (!rateLimiter.isAllowed(command.ip, normalizedEmail)) {
            throw RateLimitExceededException()
        }

        val user = userRepository.findByEmail(normalizedEmail)
        if (user == null) {
            rateLimiter.recordFailure(command.ip, normalizedEmail)
            auditLogger.logFailure(normalizedEmail, command.ip)
            throw InvalidCredentialsException()
        }

        if (!passwordHasher.verify(command.password, user.passwordHash)) {
            rateLimiter.recordFailure(command.ip, normalizedEmail)
            auditLogger.logFailure(normalizedEmail, command.ip)
            throw InvalidCredentialsException()
        }

        if (user.status != UserStatus.ACTIVE) {
            throw AccountNotActiveException()
        }

        val accessToken = tokenService.generateAccessToken(user)
        val refreshToken = tokenService.generateRefreshToken(user)

        val claims = tokenService.parseRefreshToken(refreshToken)
            ?: throw InvalidCredentialsException()

        val tokenHash = sha256(refreshToken)
        val persistedToken = RefreshToken(
            id = claims.tokenId,
            userId = user.id,
            tokenHash = tokenHash,
            expiresAt = claims.expiresAt,
            createdAt = clock.now()
        )
        refreshRepository.save(persistedToken)

        rateLimiter.recordSuccess(command.ip, normalizedEmail)
        auditLogger.logSuccess(user.id.toString(), command.ip, command.userAgent)

        return LoginResult(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = user
        )
    }

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
