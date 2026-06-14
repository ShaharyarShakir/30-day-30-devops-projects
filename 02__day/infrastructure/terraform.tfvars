environment = "dev"
aws_region  = "us-east-1"

vpc_cidr        = "192.168.0.0/16"
public_subnets  = ["192.168.1.0/24", "192.168.2.0/24"]
private_subnets = ["192.168.3.0/24", "192.168.4.0/24"]

availability_zones = ["us-east-1a", "us-east-1b"]

db_name     = "javaapp"
db_username = "admin"
db_password = "password123"

instance_type = "t2.micro"
key_name      = "devops-key"

asg_min_size         = 1
asg_max_size         = 2
asg_desired_capacity = 1

allowed_ssh_cidr_blocks = ["0.0.0.0/0"]
