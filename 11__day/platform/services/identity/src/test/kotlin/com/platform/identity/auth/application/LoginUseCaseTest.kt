package com.platform.identity.auth.application

import com.platform.identity.auth.domain.*
import com.platform.identity.common.AuditLogger
import com.platform.identity.common.ClockProvider
import com.platform.identity.user.domain.User
import com.platform.identity.user.domain.UserRepository
import com.platform.identity.user.domain.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.mockito.Mockito.*
import java.time.Instant
import java.util.UUID

class LoginUseCaseTest {

    private val userRepository = mock(UserRepository::class.java)
    private val passwordHasher = mock(PasswordHasher::class.java)
    private val tokenService = mock(TokenService::class.java)
    private val refreshRepository = mock(RefreshTokenRepository::class.java)
    private val rateLimiter = mock(RateLimiter::class.java)
    private val auditLogger = mock(AuditLogger::class.java)
    private val clock = mock(ClockProvider::class.java)

    private val useCase = LoginUseCase(
        userRepository,
        passwordHasher,
        tokenService,
        refreshRepository,
        rateLimiter,
        auditLogger,
        clock
    )

    @Suppress("UNCHECKED_CAST")
    private fun <T> anyKotlin(type: Class<T>): T {
        Mockito.any(type)
        return when (type) {
            User::class.java -> User(UUID.randomUUID(), "", "", UserStatus.PENDING, Instant.now(), Instant.now()) as T
            RefreshToken::class.java -> RefreshToken(UUID.randomUUID(), UUID.randomUUID(), "", Instant.now(), Instant.now()) as T
            else -> null as T
        }
    }

    @Test
    fun `should login successfully when credentials are correct and status is active`() {
        val command = LoginCommand("john@example.com", "Password123!", "127.0.0.1", "Mozilla/5.0")
        val userId = UUID.randomUUID()
        val now = Instant.now()
        val user = User(userId, "john@example.com", "hashed_password", UserStatus.ACTIVE, now, now)
        val tokenId = UUID.randomUUID()
        val expiresAt = now.plusSeconds(30 * 24 * 3600)

        `when`(rateLimiter.isAllowed("127.0.0.1", "john@example.com")).thenReturn(true)
        `when`(userRepository.findByEmail("john@example.com")).thenReturn(user)
        `when`(passwordHasher.verify("Password123!", "hashed_password")).thenReturn(true)
        `when`(clock.now()).thenReturn(now)

        `when`(tokenService.generateAccessToken(anyKotlin(User::class.java))).thenReturn("access_token_jwt")
        `when`(tokenService.generateRefreshToken(anyKotlin(User::class.java))).thenReturn("refresh_token_jwt")
        `when`(tokenService.parseRefreshToken("refresh_token_jwt")).thenReturn(RefreshTokenClaims(tokenId, userId, expiresAt))

        val result = useCase.execute(command)

        assertEquals("access_token_jwt", result.accessToken)
        assertEquals("refresh_token_jwt", result.refreshToken)
        assertEquals(user, result.user)

        verify(refreshRepository).save(anyKotlin(RefreshToken::class.java))
        verify(rateLimiter).recordSuccess("127.0.0.1", "john@example.com")
        verify(auditLogger).logSuccess(userId.toString(), "127.0.0.1", "Mozilla/5.0")
    }

    @Test
    fun `should throw RateLimitExceededException when rate limiter blocks attempt`() {
        val command = LoginCommand("john@example.com", "Password123!", "127.0.0.1", "Mozilla/5.0")
        `when`(rateLimiter.isAllowed("127.0.0.1", "john@example.com")).thenReturn(false)

        assertThrows(RateLimitExceededException::class.java) {
            useCase.execute(command)
        }

        verifyNoInteractions(userRepository)
        verifyNoInteractions(passwordHasher)
        verifyNoInteractions(tokenService)
        verifyNoInteractions(refreshRepository)
    }

    @Test
    fun `should throw InvalidCredentialsException when email is not found`() {
        val command = LoginCommand("unknown@example.com", "Password123!", "127.0.0.1", "Mozilla/5.0")

        `when`(rateLimiter.isAllowed("127.0.0.1", "unknown@example.com")).thenReturn(true)
        `when`(userRepository.findByEmail("unknown@example.com")).thenReturn(null)

        assertThrows(InvalidCredentialsException::class.java) {
            useCase.execute(command)
        }

        verify(rateLimiter).recordFailure("127.0.0.1", "unknown@example.com")
        verify(auditLogger).logFailure("unknown@example.com", "127.0.0.1")
        verifyNoInteractions(passwordHasher)
    }

    @Test
    fun `should throw InvalidCredentialsException when password does not match`() {
        val command = LoginCommand("john@example.com", "WrongPassword!", "127.0.0.1", "Mozilla/5.0")
        val user = User(UUID.randomUUID(), "john@example.com", "hashed_password", UserStatus.ACTIVE, Instant.now(), Instant.now())

        `when`(rateLimiter.isAllowed("127.0.0.1", "john@example.com")).thenReturn(true)
        `when`(userRepository.findByEmail("john@example.com")).thenReturn(user)
        `when`(passwordHasher.verify("WrongPassword!", "hashed_password")).thenReturn(false)

        assertThrows(InvalidCredentialsException::class.java) {
            useCase.execute(command)
        }

        verify(rateLimiter).recordFailure("127.0.0.1", "john@example.com")
        verify(auditLogger).logFailure("john@example.com", "127.0.0.1")
    }

    @Test
    fun `should throw AccountNotActiveException when user status is not ACTIVE`() {
        val command = LoginCommand("john@example.com", "Password123!", "127.0.0.1", "Mozilla/5.0")
        val user = User(UUID.randomUUID(), "john@example.com", "hashed_password", UserStatus.PENDING, Instant.now(), Instant.now())

        `when`(rateLimiter.isAllowed("127.0.0.1", "john@example.com")).thenReturn(true)
        `when`(userRepository.findByEmail("john@example.com")).thenReturn(user)
        `when`(passwordHasher.verify("Password123!", "hashed_password")).thenReturn(true)

        assertThrows(AccountNotActiveException::class.java) {
            useCase.execute(command)
        }

        verifyNoInteractions(tokenService)
        verifyNoInteractions(refreshRepository)
    }
}
