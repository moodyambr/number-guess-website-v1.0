#!/bin/bash
# ec2-setup.sh - Run ONCE on EC2 after launch (Ubuntu)
# How to use: scp ec2-setup.sh ubuntu@<IP>:~/ && ssh ... bash ec2-setup.sh
set -e
echo "=== EC2 Setup: Number Guess Game ==="
echo "Updating system..."
sudo apt-get update -y -q
sudo apt-get upgrade -y -q
echo "Installing Java 21..."
sudo apt-get install -y openjdk-21-jdk
java -version
echo "Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y -q
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
echo "Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin
# Also install standalone docker-compose for compatibility
COMPOSE_VER=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d'"' -f4)
sudo curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
mkdir -p ~/app
echo "=== Setup done! ==="
echo "Next steps:"
echo "  1. Log out and back in (Docker permissions)"
echo "  2. Create ~/app/.env with production values"
echo "  3. Run ./deploy.sh on your Mac"
