package com.platform.identity.user.infrastructure

import com.platform.identity.user.domain.User

object UserMapper {
    fun toEntity(domain: User): UserEntity = UserEntity(
        id = domain.id,
        email = domain.email,
        passwordHash = domain.passwordHash,
        status = domain.status,
        createdAt = domain.createdAt,
        updatedAt = domain.updatedAt
    )

    fun toDomain(entity: UserEntity): User = User(
        id = entity.id,
        email = entity.email,
        passwordHash = entity.passwordHash,
        status = entity.status,
        createdAt = entity.createdAt,
        updatedAt = entity.updatedAt
    )
}
