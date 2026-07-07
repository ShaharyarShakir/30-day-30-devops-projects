variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

variable "db_password" {
  type        = string
  description = "Postgres root user password"
  sensitive   = true
}

variable "subnet_ids" {
  type        = list(string)
  description = "VPC subnets for deployment"
  default     = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
}
