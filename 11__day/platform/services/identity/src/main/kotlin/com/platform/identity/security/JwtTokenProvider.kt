package com.platform.identity.security

import com.platform.identity.auth.domain.AccessToken
import com.platform.identity.auth.domain.JwtPrincipal
import com.platform.identity.auth.domain.JwtProvider
import com.platform.identity.auth.domain.RefreshTokenClaims
import com.platform.identity.auth.infrastructure.SecurityJwtProperties
import com.platform.identity.user.domain.User
import io.jsonwebtoken.Jwts
import org.springframework.stereotype.Component
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.*

@Component
class JwtTokenProvider(
    private val privateKey: RSAPrivateKey,
    private val publicKey: RSAPublicKey,
    private val jwtProperties: SecurityJwtProperties
) : JwtProvider {

    override fun generate(user: User): AccessToken {
        val now = Instant.now()
        val expiry = now.plus(jwtProperties.accessTokenExpiration)

        val jwt = Jwts.builder()
            .subject(user.id.toString())
            .issuer(jwtProperties.issuer)
            .claim("email", user.email)
            .claim("roles", listOf("STUDENT"))
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(privateKey, Jwts.SIG.RS256)
            .compact()

        return AccessToken(jwt, expiry)
    }

    override fun verify(token: String): JwtPrincipal {
        val claims = Jwts.parser()
            .verifyWith(publicKey)
            .requireIssuer(jwtProperties.issuer)
            .build()
            .parseSignedClaims(token)
            .payload

        val userId = UUID.fromString(claims.subject)
        val email = claims["email"] as? String ?: throw IllegalArgumentException("Missing email claim")
        val rolesList = claims["roles"] as? List<*> ?: emptyList<Any>()
        val roles = rolesList.map { it.toString() }.toSet()

        return JwtPrincipal(userId, email, roles)
    }

    override fun generateRefreshToken(user: User, tokenId: UUID): String {
        val now = Instant.now()
        val expiry = now.plus(jwtProperties.refreshTokenExpiration)

        return Jwts.builder()
            .id(tokenId.toString())
            .subject(user.id.toString())
            .issuer(jwtProperties.issuer)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(privateKey, Jwts.SIG.RS256)
            .compact()
    }

    override fun verifyRefreshToken(token: String): RefreshTokenClaims? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(jwtProperties.issuer)
                .build()
                .parseSignedClaims(token)
                .payload

            val tokenId = UUID.fromString(claims.id)
            val userId = UUID.fromString(claims.subject)
            val expiresAt = claims.expiration.toInstant()

            RefreshTokenClaims(tokenId, userId, expiresAt)
        } catch (e: Exception) {
            null
        }
    }
}
