30 days 30 devops projects




- to add the ssh agent 
````
```bash
docker exec floci-ec2-i-bb8f290ae49321425 yum install -y openssh-server
docker exec floci-ec2-i-bb8f290ae49321425 ssh-keygen -A
docker exec floci-ec2-i-bb8f290ae49321425 /usr/sbin/sshd
```
