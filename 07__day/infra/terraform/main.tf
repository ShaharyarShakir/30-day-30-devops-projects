terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC Network for Platform
resource "aws_vpc" "platform_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "resume-ai-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.platform_vpc.id
  tags = {
    Name = "resume-ai-igw"
  }
}

# Subnets
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.platform_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"
  tags = {
    Name = "resume-ai-public-subnet"
  }
}

# 2. S3 Object Storage Bucket for Resumes and ML Models
resource "aws_s3_bucket" "resume_bucket" {
  bucket        = "resume-ai-platform-${var.environment}-resumes"
  force_destroy = true
  tags = {
    Name        = "Resume Bucket"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "resume_bucket_privacy" {
  bucket = aws_s3_bucket.resume_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. PostgreSQL Database (RDS)
resource "aws_db_instance" "postgres" {
  allocated_storage      = 20
  db_name                = "resume_ai"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t4g.micro"
  username               = var.db_username
  password               = var.db_password
  parameter_group_name   = "default.postgres16"
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
}

resource "aws_db_subnet_group" "db_subnets" {
  name       = "resume-ai-db-subnet-group"
  subnet_ids = [aws_subnet.public_subnet.id, aws_subnet.private_subnet.id]
}

resource "aws_subnet" "private_subnet" {
  vpc_id            = aws_vpc.platform_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
  tags = {
    Name = "resume-ai-private-subnet"
  }
}

# Security Group for Postgres
resource "aws_security_group" "db_sg" {
  name        = "resume-ai-db-sg"
  description = "Allow inbound postgres access"
  vpc_id      = aws_vpc.platform_vpc.id

  ingress {
    description = "PostgreSQL access from VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.platform_vpc.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. Elastic Kubernetes Service (EKS) Cluster
resource "aws_eks_cluster" "eks" {
  name     = "resume-ai-cluster-${var.environment}"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.public_subnet.id, aws_subnet.private_subnet.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

# IAM Role for EKS
resource "aws_iam_role" "eks_cluster_role" {
  name = "resume-ai-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}
