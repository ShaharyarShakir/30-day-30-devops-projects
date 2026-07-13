package com.platform.identity.auth.api

import org.springframework.http.ResponseCookie

interface CookieFactory {
    fun accessToken(token: String): ResponseCookie
    fun refreshToken(token: String): ResponseCookie
}
