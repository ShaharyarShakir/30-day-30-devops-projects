package com.platform.identity.auth.infrastructure

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component
import org.springframework.core.io.Resource
import java.time.Duration

@Component
@ConfigurationProperties(prefix = "security.jwt")
class SecurityJwtProperties {
    lateinit var issuer: String
    lateinit var accessTokenExpiration: Duration
    lateinit var refreshTokenExpiration: Duration
    lateinit var privateKey: Resource
    lateinit var publicKey: Resource
}
