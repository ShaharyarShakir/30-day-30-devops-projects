# API Specifications

The platform gateway serves as the primary router.

## Ingress Inbound Routing

| Public Endpoint Path | Downstream Destination URL  | Description                       | Auth Requirement      |
| :------------------- | :-------------------------- | :-------------------------------- | :-------------------- |
| `GET /health`        | Internal API Gateway Health | Check Gateway health              | None                  |
| `GET /ready`         | Internal API Gateway Ready  | Check Gateway database readiness  | None                  |
| `GET /live`          | Internal API Gateway Live   | Check Gateway runtime status      | None                  |
| `/api/v1/auth/*`     | `http://auth:8080/*`        | Authentication service forwarding | Handled by downstream |

## Auth Service Endpoints (Internal / Promoted)

- **GET `/health`**: Returns JSON health state of the auth microservice.
- **POST `/api/v1/auth/register`** (Planned): Create a user.
- **POST `/api/v1/auth/login`** (Planned): Verify credentials and issue tokens.
- **POST `/api/v1/auth/refresh`** (Planned): Retrieve new JWT with refresh token.
