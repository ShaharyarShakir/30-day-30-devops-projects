package com.platform.identity.auth.api

import com.platform.identity.auth.application.LoginCommand
import com.platform.identity.auth.application.LoginUseCase
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.security.interfaces.RSAPublicKey
import java.util.Base64

@RestController
@RequestMapping("/auth")
class AuthController(
    private val loginUseCase: LoginUseCase,
    private val publicKey: RSAPublicKey,
    private val cookieFactory: CookieFactory
) {

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        servletRequest: HttpServletRequest
    ): ResponseEntity<LoginResponse> {
        val ip = resolveIp(servletRequest)
        val userAgent = servletRequest.getHeader("User-Agent") ?: "unknown"

        val command = LoginCommand(
            email = request.email,
            password = request.password,
            ip = ip,
            userAgent = userAgent
        )

        val result = loginUseCase.execute(command)

        val accessCookie = cookieFactory.accessToken(result.accessToken)
        val refreshCookie = cookieFactory.refreshToken(result.refreshToken)

        val responseBody = LoginResponse(
            user = UserResponse(
                id = result.user.id.toString(),
                email = result.user.email,
                status = result.user.status.name
            )
        )

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(responseBody)
    }

    @GetMapping("/public-key")
    fun getPublicKey(): ResponseEntity<String> {
        val encoder = Base64.getMimeEncoder(64, "\n".toByteArray())
        val base64 = encoder.encodeToString(publicKey.encoded)
        val pem = "-----BEGIN PUBLIC KEY-----\n$base64\n-----END PUBLIC KEY-----\n"
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, "text/plain")
            .body(pem)
    }

    @GetMapping("/jwks")
    fun getJwks(): ResponseEntity<Map<String, Any>> {
        val modulus = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.modulus.toByteArray())
        val exponent = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.publicExponent.toByteArray())

        val jwks = mapOf(
            "keys" to listOf(
                mapOf(
                    "kty" to "RSA",
                    "alg" to "RS256",
                    "use" to "sig",
                    "kid" to "identity-key",
                    "n" to modulus,
                    "e" to exponent
                )
            )
        )
        return ResponseEntity.ok(jwks)
    }

    private fun resolveIp(request: HttpServletRequest): String {
        val xff = request.getHeader("X-Forwarded-For")
        return if (!xff.isNullOrBlank()) {
            xff.split(",")[0].trim()
        } else {
            request.remoteAddr ?: "unknown"
        }
    }
}
