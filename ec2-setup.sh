#!/bin/bash
# ec2-setup.sh - Run ONCE on EC2 after launch
# How to use: scp ec2-setup.sh ec2-user@<IP>:~/ && ssh ... bash ec2-setup.sh
set -e
echo "=== EC2 Setup: Number Guess Game ==="
echo "Updating system..."
sudo dnf update -y -q
echo "Installing Java 21..."
sudo dnf install -y java-21-amazon-corretto
java -version
echo "Installing Docker..."
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
echo "Installing Docker Compose..."
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
