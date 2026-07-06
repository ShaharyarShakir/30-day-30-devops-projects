variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS target region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name"
}

variable "db_username" {
  type        = string
  default     = "postgres"
  description = "PostgreSQL root admin username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "SuperSecretPostgresPassword123!"
  description = "PostgreSQL root admin password"
}
