package com.platform.identity.common

import java.util.UUID

interface IdGenerator {
    fun generate(): UUID
}
