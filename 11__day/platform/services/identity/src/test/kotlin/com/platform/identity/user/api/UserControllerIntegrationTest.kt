package com.platform.identity.user.api

import com.fasterxml.jackson.databind.ObjectMapper
import com.platform.identity.user.domain.UserRepository
import com.platform.identity.user.domain.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    fun `should register user successfully via HTTP API`() {
        val email = "integration_${System.currentTimeMillis()}@example.com"
        val request = RegisterRequest(
            email = email,
            password = "securePassword123"
        )

        mockMvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.email").value(email))
            .andExpect(jsonPath("$.status").value("PENDING"))

        val savedUser = userRepository.findByEmail(email)
        assertNotNull(savedUser)
        assertEquals(UserStatus.PENDING, savedUser?.status)
    }

    @Test
    fun `should fail registration when email is invalid`() {
        val request = RegisterRequest(
            email = "invalid-email",
            password = "securePassword123"
        )

        mockMvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("email")))
    }

    @Test
    fun `should fail registration when password is too short`() {
        val request = RegisterRequest(
            email = "valid@example.com",
            password = "short"
        )

        mockMvc.perform(
            post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("Bad Request"))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("password")))
    }
}
