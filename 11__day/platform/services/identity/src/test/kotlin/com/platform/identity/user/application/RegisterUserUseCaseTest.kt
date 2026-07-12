package com.platform.identity.user.application

import com.platform.identity.auth.domain.PasswordHasher
import com.platform.identity.common.ClockProvider
import com.platform.identity.common.IdGenerator
import com.platform.identity.user.domain.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.mockito.Mockito.*
import java.time.Instant
import java.util.UUID

class RegisterUserUseCaseTest {

    private val repository = mock(UserRepository::class.java)
    private val passwordHasher = mock(PasswordHasher::class.java)
    private val idGenerator = mock(IdGenerator::class.java)
    private val clock = mock(ClockProvider::class.java)
    private val eventPublisher = mock(UserEventPublisher::class.java)

    private val useCase = RegisterUserUseCase(
        repository,
        passwordHasher,
        idGenerator,
        clock,
        eventPublisher
    )

    @Suppress("UNCHECKED_CAST")
    private fun <T> anyKotlin(type: Class<T>): T {
        Mockito.any(type)
        return when (type) {
            User::class.java -> User(UUID.randomUUID(), "", "", UserStatus.PENDING, Instant.now(), Instant.now()) as T
            UserCreatedEvent::class.java -> UserCreatedEvent(UUID.randomUUID(), "") as T
            else -> null as T
        }
    }

    @Test
    fun `should register user successfully`() {
        val command = RegisterUserCommand("alice@example.com", "password123")
        val userId = UUID.randomUUID()
        val now = Instant.now()

        `when`(repository.findByEmail("alice@example.com")).thenReturn(null)
        `when`(idGenerator.generate()).thenReturn(userId)
        `when`(clock.now()).thenReturn(now)
        `when`(passwordHasher.hash("password123")).thenReturn("hashed_password")

        val expectedUser = User(
            id = userId,
            email = "alice@example.com",
            passwordHash = "hashed_password",
            status = UserStatus.PENDING,
            createdAt = now,
            updatedAt = now
        )
        `when`(repository.save(anyKotlin(User::class.java))).thenReturn(expectedUser)

        val result = useCase.execute(command)

        assertEquals(expectedUser, result)
        verify(repository).save(anyKotlin(User::class.java))
        verify(eventPublisher).publish(anyKotlin(UserCreatedEvent::class.java))
    }

    @Test
    fun `should throw exception when email exists`() {
        val command = RegisterUserCommand("ALice@example.com", "password123")

        val existingUser = User(
            id = UUID.randomUUID(),
            email = "alice@example.com",
            passwordHash = "hashed_password",
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        `when`(repository.findByEmail("alice@example.com")).thenReturn(existingUser)

        assertThrows(EmailAlreadyExistsException::class.java) {
            useCase.execute(command)
        }

        verify(repository, never()).save(anyKotlin(User::class.java))
        verify(eventPublisher, never()).publish(anyKotlin(UserCreatedEvent::class.java))
    }
}
