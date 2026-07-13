package com.platform.identity.security

import com.platform.identity.auth.infrastructure.SecurityJwtProperties
import com.platform.identity.user.domain.User
import com.platform.identity.user.domain.UserStatus
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.IncorrectClaimException
import io.jsonwebtoken.security.SignatureException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.time.Duration
import java.time.Instant
import java.util.UUID

class JwtTokenProviderTest {

    private lateinit var privateKey: RSAPrivateKey
    private lateinit var publicKey: RSAPublicKey
    private val jwtProperties = SecurityJwtProperties()
    private lateinit var provider: JwtTokenProvider

    @BeforeEach
    fun setUp() {
        val generator = KeyPairGenerator.getInstance("RSA")
        generator.initialize(2048)
        val pair = generator.generateKeyPair()
        privateKey = pair.private as RSAPrivateKey
        publicKey = pair.public as RSAPublicKey

        jwtProperties.issuer = "test-issuer"
        jwtProperties.accessTokenExpiration = Duration.ofMinutes(15)
        jwtProperties.refreshTokenExpiration = Duration.ofDays(30)

        provider = JwtTokenProvider(privateKey, publicKey, jwtProperties)
    }

    @Test
    fun `should generate token, verify signature, and read claims successfully`() {
        val userId = UUID.randomUUID()
        val user = User(
            id = userId,
            email = "test@example.com",
            passwordHash = "hash",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val token = provider.generate(user)
        assertNotNull(token.value)
        assertTrue(token.expiresAt.isAfter(Instant.now()))

        val principal = provider.verify(token.value)
        assertEquals(userId, principal.userId)
        assertEquals("test@example.com", principal.email)
        assertEquals(setOf("STUDENT"), principal.roles)
    }

    @Test
    fun `should generate and verify refresh token successfully`() {
        val userId = UUID.randomUUID()
        val user = User(
            id = userId,
            email = "test@example.com",
            passwordHash = "hash",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val tokenId = UUID.randomUUID()
        val tokenStr = provider.generateRefreshToken(user, tokenId)
        assertNotNull(tokenStr)

        val claims = provider.verifyRefreshToken(tokenStr)
        assertNotNull(claims)
        assertEquals(tokenId, claims!!.tokenId)
        assertEquals(userId, claims.userId)
        assertTrue(claims.expiresAt.isAfter(Instant.now()))
    }

    @Test
    fun `should reject expired token`() {
        val localProperties = SecurityJwtProperties()
        localProperties.issuer = "test-issuer"
        localProperties.accessTokenExpiration = Duration.ofSeconds(-1)
        localProperties.refreshTokenExpiration = Duration.ofDays(30)

        val shortLivedProvider = JwtTokenProvider(privateKey, publicKey, localProperties)

        val user = User(
            id = UUID.randomUUID(),
            email = "expired@example.com",
            passwordHash = "hash",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val token = shortLivedProvider.generate(user)

        assertThrows(ExpiredJwtException::class.java) {
            provider.verify(token.value)
        }
    }

    @Test
    fun `should reject token with invalid signature`() {
        val user = User(
            id = UUID.randomUUID(),
            email = "tampered@example.com",
            passwordHash = "hash",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val token = provider.generate(user)

        val otherGenerator = KeyPairGenerator.getInstance("RSA")
        otherGenerator.initialize(2048)
        val otherPair = otherGenerator.generateKeyPair()
        val otherPublicKey = otherPair.public as RSAPublicKey

        val wrongPublicKeyProvider = JwtTokenProvider(privateKey, otherPublicKey, jwtProperties)

        assertThrows(SignatureException::class.java) {
            wrongPublicKeyProvider.verify(token.value)
        }
    }

    @Test
    fun `should reject token with wrong issuer`() {
        val user = User(
            id = UUID.randomUUID(),
            email = "issuer@example.com",
            passwordHash = "hash",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val token = provider.generate(user)

        val diffIssuerProps = SecurityJwtProperties()
        diffIssuerProps.issuer = "different-issuer"
        diffIssuerProps.accessTokenExpiration = Duration.ofMinutes(15)
        diffIssuerProps.refreshTokenExpiration = Duration.ofDays(30)

        val diffIssuerProvider = JwtTokenProvider(privateKey, publicKey, diffIssuerProps)

        assertThrows(IncorrectClaimException::class.java) {
            diffIssuerProvider.verify(token.value)
        }
    }
}
