package com.platform.identity.health

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {

    @GetMapping("/health")
    fun health() = mapOf(
        "status" to "UP",
        "service" to "identity-service"
    )

}
