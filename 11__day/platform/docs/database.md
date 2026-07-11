# Database Design and Ownership

We enforce the **Database-per-service** pattern. No microservice is permitted to access another service's database directly. All cross-service data integration must happen through APIs or asynchronous event communication.

## Database Assignments

| Service                     | Database Engine | Database/Schema Name            | Logical Mode                 |
| :-------------------------- | :-------------- | :------------------------------ | :--------------------------- |
| **Auth Service**            | PostgreSQL      | `platform_auth`                 | SQL Relational               |
| **Course Service** (Future) | MongoDB         | `platform_courses`              | Document NoSQL               |
| **Chat Service** (Future)   | MongoDB         | `platform_chats`                | Document NoSQL / Time-Series |
| **Caching / Session**       | Redis           | Redis Database `0`              | Key-Value Store              |
| **File Storage**            | Garage S3       | S3 Buckets (`assets`, `videos`) | Object Storage               |

## Caching Strategy

- Redis is utilized for token blacklisting, session tracking, and rate limiter stores.
- Eviction policy: `allkeys-lru` for cache databases, `noeviction` for persistent token sessions.
