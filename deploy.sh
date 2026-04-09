#!/bin/zsh
# deploy.sh - Build and deploy to AWS EC2
# Usage: EC2_HOST=1.2.3.4 KEY_FILE=~/.ssh/key.pem ./deploy.sh
set -e
cd "$(dirname "$0")"
if [ -z "$EC2_HOST" ] || [ -z "$KEY_FILE" ]; then
  echo "ERROR: missing EC2_HOST or KEY_FILE"
  echo "Usage: EC2_HOST=<ip> KEY_FILE=~/.ssh/key.pem ./deploy.sh"
  exit 1
fi
EC2_USER="${EC2_USER:-ubuntu}"
SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=no"
echo "=== Deploying to $EC2_USER@$EC2_HOST ==="
echo "Building JAR..."
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export PATH="$JAVA_HOME/bin:$PATH"
./mvnw clean package -DskipTests -q
echo "JAR built successfully"
echo "Creating app dir on EC2..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" "mkdir -p ~/app"
echo "Copying files to EC2..."
scp $SSH_OPTS \
  target/number-guess-0.0.1-SNAPSHOT.jar \
  docker-compose.yaml \
  ec2-start.sh \
  "$EC2_USER@$EC2_HOST:~/app/"
echo "Starting app on EC2..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" "chmod +x ~/app/ec2-start.sh && bash ~/app/ec2-start.sh"
echo "=== Deploy done! Open: http://$EC2_HOST:8080 ==="
