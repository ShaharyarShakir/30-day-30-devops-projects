package com.platform.identity.user.api

import com.platform.identity.user.application.RegisterUserCommand
import com.platform.identity.user.application.RegisterUserUseCase
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/auth")
class UserController(
    private val registerUserUseCase: RegisterUserUseCase
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<RegisterResponse> {
        val command = RegisterUserCommand(
            email = request.email,
            password = request.password
        )
        val user = registerUserUseCase.execute(command)
        val response = RegisterResponse(
            id = user.id,
            email = user.email,
            status = user.status.name
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }
}
