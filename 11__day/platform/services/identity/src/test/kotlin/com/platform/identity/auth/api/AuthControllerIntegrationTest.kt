package com.platform.identity.auth.api

import com.fasterxml.jackson.databind.ObjectMapper
import com.platform.identity.auth.domain.PasswordHasher
import com.platform.identity.user.domain.User
import com.platform.identity.user.domain.UserRepository
import com.platform.identity.user.domain.UserStatus
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordHasher: PasswordHasher

    @Test
    fun `should login successfully and set http-only cookies`() {
        val email = "login_success_${System.currentTimeMillis()}@example.com"
        val rawPassword = "SuperSecretPassword123!"
        val hash = passwordHasher.hash(rawPassword)

        val user = User(
            id = UUID.randomUUID(),
            email = email,
            passwordHash = hash,
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        userRepository.save(user)

        val loginRequest = LoginRequest(email = email, password = rawPassword)

        mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(cookie().exists("access_token"))
            .andExpect(cookie().httpOnly("access_token", true))
            .andExpect(cookie().secure("access_token", true))
            .andExpect(cookie().exists("refresh_token"))
            .andExpect(cookie().httpOnly("refresh_token", true))
            .andExpect(cookie().secure("refresh_token", true))
            .andExpect(cookie().path("refresh_token", "/auth"))
            .andExpect(jsonPath("$.user.email").value(email))
            .andExpect(jsonPath("$.user.status").value("ACTIVE"))
            .andExpect(jsonPath("$.user.id").value(user.id.toString()))
    }

    @Test
    fun `should fail login with 403 Forbidden when user is not ACTIVE`() {
        val email = "login_pending_${System.currentTimeMillis()}@example.com"
        val rawPassword = "SuperSecretPassword123!"
        val hash = passwordHasher.hash(rawPassword)

        val user = User(
            id = UUID.randomUUID(),
            email = email,
            passwordHash = hash,
            status = UserStatus.PENDING,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        userRepository.save(user)

        val loginRequest = LoginRequest(email = email, password = rawPassword)

        mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.error").value("Forbidden"))
            .andExpect(jsonPath("$.message").value(containsString("Account is not active")))
    }

    @Test
    fun `should fail login with 401 Unauthorized when password is incorrect`() {
        val email = "login_wrong_pass_${System.currentTimeMillis()}@example.com"
        val rawPassword = "SuperSecretPassword123!"
        val hash = passwordHasher.hash(rawPassword)

        val user = User(
            id = UUID.randomUUID(),
            email = email,
            passwordHash = hash,
            status = UserStatus.ACTIVE,
            createdAt = Instant.now(),
            updatedAt = Instant.now()
        )
        userRepository.save(user)

        val loginRequest = LoginRequest(email = email, password = "wrongPassword")

        mockMvc.perform(
            post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error").value("Unauthorized"))
            .andExpect(jsonPath("$.message").value("Invalid credentials"))
    }

    @Test
    fun `should retrieve public key in PEM format`() {
        mockMvc.perform(get("/auth/public-key"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
            .andExpect(content().string(containsString("-----BEGIN PUBLIC KEY-----")))
            .andExpect(content().string(containsString("-----END PUBLIC KEY-----")))
    }

    @Test
    fun `should retrieve jwks endpoint`() {
        mockMvc.perform(get("/auth/jwks"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.keys[0].kty").value("RSA"))
            .andExpect(jsonPath("$.keys[0].alg").value("RS256"))
            .andExpect(jsonPath("$.keys[0].use").value("sig"))
            .andExpect(jsonPath("$.keys[0].n").exists())
            .andExpect(jsonPath("$.keys[0].e").exists())
    }
}
