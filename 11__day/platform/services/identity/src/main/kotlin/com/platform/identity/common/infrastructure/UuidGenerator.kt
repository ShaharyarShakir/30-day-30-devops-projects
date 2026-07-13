package com.platform.identity.common.infrastructure

import com.platform.identity.common.IdGenerator
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class UuidGenerator : IdGenerator {
    override fun generate(): UUID = UUID.randomUUID()
}
