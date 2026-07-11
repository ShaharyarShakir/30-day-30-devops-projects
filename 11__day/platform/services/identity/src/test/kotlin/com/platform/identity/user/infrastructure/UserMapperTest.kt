package com.platform.identity.user.infrastructure

import com.platform.identity.user.domain.User
import com.platform.identity.user.domain.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class UserMapperTest {

    @Test
    fun `should map domain model to entity and back`() {
        val domainUser = User(
            id = UUID.randomUUID(),
            email = "test@example.com",
            passwordHash = "hashedpassword",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )

        val entity = UserMapper.toEntity(domainUser)

        assertEquals(domainUser.id, entity.id)
        assertEquals(domainUser.email, entity.email)
        assertEquals(domainUser.passwordHash, entity.passwordHash)
        assertEquals(domainUser.status, entity.status)
        assertEquals(domainUser.createdAt, entity.createdAt)
        assertEquals(domainUser.updatedAt, entity.updatedAt)

        val mappedBack = UserMapper.toDomain(entity)

        assertEquals(domainUser, mappedBack)
    }
}
