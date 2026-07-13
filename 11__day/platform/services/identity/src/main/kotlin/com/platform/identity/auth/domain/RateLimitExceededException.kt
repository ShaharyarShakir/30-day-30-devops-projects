package com.platform.identity.auth.domain

class RateLimitExceededException : RuntimeException("Too many login attempts. Please try again later.")
