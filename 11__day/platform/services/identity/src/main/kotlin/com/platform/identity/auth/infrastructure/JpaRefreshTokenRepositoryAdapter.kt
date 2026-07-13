package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.RefreshToken
import com.platform.identity.auth.domain.RefreshTokenRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest

@Repository
class JpaRefreshTokenRepositoryAdapter(
    private val jpaRefreshTokenRepository: JpaRefreshTokenRepository
) : RefreshTokenRepository {

    override fun save(token: RefreshToken) {
        val entity = RefreshTokenEntity(
            id = token.id,
            userId = token.userId,
            token = token.tokenHash,
            expiresAt = token.expiresAt,
            createdAt = token.createdAt
        )
        jpaRefreshTokenRepository.save(entity)
    }

    override fun find(token: String): RefreshToken? {
        val hash = sha256(token)
        return jpaRefreshTokenRepository.findByToken(hash)?.let {
            RefreshToken(
                id = it.id,
                userId = it.userId,
                tokenHash = it.token,
                expiresAt = it.expiresAt,
                createdAt = it.createdAt
            )
        }
    }

    @Transactional
    override fun delete(token: String) {
        val hash = sha256(token)
        jpaRefreshTokenRepository.deleteByToken(hash)
    }

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return hashBytes.joinToString("") { "%02x".format(it) }
    }
}
