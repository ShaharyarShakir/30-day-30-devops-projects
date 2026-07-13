package com.platform.identity.user.application

import com.platform.identity.auth.domain.PasswordHasher
import com.platform.identity.common.ClockProvider
import com.platform.identity.common.IdGenerator
import com.platform.identity.user.domain.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RegisterUserUseCase(
    private val repository: UserRepository,
    private val passwordHasher: PasswordHasher,
    private val idGenerator: IdGenerator,
    private val clock: ClockProvider,
    private val eventPublisher: UserEventPublisher
) {

    @Transactional
    fun execute(command: RegisterUserCommand): User {
        val normalizedEmail = command.email.trim().lowercase()

        if (repository.findByEmail(normalizedEmail) != null) {
            throw EmailAlreadyExistsException(normalizedEmail)
        }

        val passwordHash = passwordHasher.hash(command.password)
        val now = clock.now()

        val user = User(
            id = idGenerator.generate(),
            email = normalizedEmail,
            passwordHash = passwordHash,
            status = UserStatus.PENDING,
            createdAt = now,
            updatedAt = now
        )

        val savedUser = repository.save(user)

        eventPublisher.publish(
            UserCreatedEvent(
                id = savedUser.id,
                email = savedUser.email
            )
        )

        return savedUser
    }
}
