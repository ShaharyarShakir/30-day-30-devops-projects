package com.platform.identity.auth.domain

import com.platform.identity.user.domain.User

interface AccessTokenService {
    fun generate(user: User): AccessToken
}
