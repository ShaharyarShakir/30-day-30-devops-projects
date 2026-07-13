package com.platform.identity.security

import com.platform.identity.auth.infrastructure.SecurityJwtProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.security.KeyFactory
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

@Configuration
class JwtKeyProvider(
    private val jwtProperties: SecurityJwtProperties
) {

    @Bean
    fun privateKey(): RSAPrivateKey {
        val keyContent = jwtProperties.privateKey.inputStream.bufferedReader().use { it.readText() }
        return parsePrivateKey(keyContent)
    }

    @Bean
    fun publicKey(): RSAPublicKey {
        val keyContent = jwtProperties.publicKey.inputStream.bufferedReader().use { it.readText() }
        return parsePublicKey(keyContent)
    }

    private fun parsePrivateKey(key: String): RSAPrivateKey {
        val cleanKey = key
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace("-----BEGIN RSA PRIVATE KEY-----", "")
            .replace("-----END RSA PRIVATE KEY-----", "")
            .replace("\\s".toRegex(), "")
        val decoded = Base64.getDecoder().decode(cleanKey)
        val spec = PKCS8EncodedKeySpec(decoded)
        return KeyFactory.getInstance("RSA").generatePrivate(spec) as RSAPrivateKey
    }

    private fun parsePublicKey(key: String): RSAPublicKey {
        val cleanKey = key
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace("\\s".toRegex(), "")
        val decoded = Base64.getDecoder().decode(cleanKey)
        val spec = X509EncodedKeySpec(decoded)
        return KeyFactory.getInstance("RSA").generatePublic(spec) as RSAPublicKey
    }
}
