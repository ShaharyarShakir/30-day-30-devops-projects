#!/bin/sh

dnf install -y openssh-server

mkdir -p /run/sshd
mkdir -p /root/.ssh

/usr/sbin/sshd

