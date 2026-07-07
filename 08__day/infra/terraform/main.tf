terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Network: VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "chaindeploy-vpc"
  }
}

# 2. Database: RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  allocated_storage      = 20
  db_name                = "chaindeploy"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t3.micro"
  username               = "postgres"
  password               = var.db_password
  parameter_group_name   = "default.postgres16"
  skip_final_snapshot    = true
  publicly_accessible    = false
  tags = {
    Name = "chaindeploy-rds"
  }
}

# 3. Cache: ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "chaindeploy-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  tags = {
    Name = "chaindeploy-redis"
  }
}

# 4. Kubernetes: EKS Cluster
resource "aws_eks_cluster" "eks" {
  name     = "chaindeploy-eks"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

# IAM Role for EKS Cluster Control Plane
resource "aws_iam_role" "eks_role" {
  name = "chaindeploy-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_role.name
}
