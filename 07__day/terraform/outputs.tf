output "vpc_id" {
  value       = aws_vpc.platform_vpc.id
  description = "The ID of the provisioned VPC"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.resume_bucket.id
  description = "The name of the resumes bucket"
}

output "postgres_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "The database endpoint connection string"
}

output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.eks.endpoint
  description = "The EKS cluster endpoint URL"
}

output "eks_cluster_name" {
  value       = aws_eks_cluster.eks.name
  description = "The name of EKS cluster"
}
