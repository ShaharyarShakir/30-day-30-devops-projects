package com.platform.identity.auth.domain

interface RefreshTokenRepository {
    fun save(token: RefreshToken)
    fun find(token: String): RefreshToken?
    fun delete(token: String)
}
