import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("health")
  health() {
    return {
      status: "UP",
      timestamp: new Date().toISOString(),
      service: "gateway",
      checks: []
    };
  }

  @Get("ready")
  ready() {
    return {
      status: "READY",
      timestamp: new Date().toISOString(),
      service: "gateway"
    };
  }

  @Get("live")
  live() {
    return {
      status: "ALIVE",
      timestamp: new Date().toISOString(),
      service: "gateway"
    };
  }
}
