# ASG Module

resource "aws_instance" "main" {
  count                  = var.desired_capacity
  ami                    = "ami-0c02fb55956c7d316" # Amazon Linux 2
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]
  vpc_security_group_ids = var.security_group_ids

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y java-11-amazon-corretto
              yum install -y tomcat
              systemctl enable tomcat
              systemctl start tomcat
              EOF

  tags = {
    Name        = "${var.environment}-web-instance-${count.index + 1}"
    Environment = var.environment
  }
}

resource "aws_lb_target_group_attachment" "main" {
  count            = var.desired_capacity
  target_group_arn = var.target_group_arns[0]
  target_id        = aws_instance.main[count.index].id
  port             = 8080
}
