package com.platform.identity.user.infrastructure

import com.platform.identity.user.domain.User
import com.platform.identity.user.domain.UserRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JpaUserRepositoryAdapter(
    private val jpaUserRepository: JpaUserRepository
) : UserRepository {

    override fun save(user: User): User {
        val entity = UserMapper.toEntity(user)
        val savedEntity = jpaUserRepository.save(entity)
        return UserMapper.toDomain(savedEntity)
    }

    override fun findByEmail(email: String): User? {
        return jpaUserRepository.findByEmail(email)?.let { UserMapper.toDomain(it) }
    }

    override fun findById(id: UUID): User? {
        return jpaUserRepository.findById(id).map { UserMapper.toDomain(it) }.orElse(null)
    }
}
