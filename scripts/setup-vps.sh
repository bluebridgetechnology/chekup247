#!/usr/bin/env bash
# ==============================================================================
# ChekUp247 — Ubuntu VPS Bootstrap & Provisioning Script
# Target: Ubuntu 22.04 / 24.04 LTS (4 vCPU, 8GB RAM, 40GB SSD)
# Run as root: sudo bash scripts/setup-vps.sh
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo " Starting ChekUp247 VPS Initialization"
echo "===================================================================="

# 1. Update system packages
echo "📦 Updating apt packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates gnupg lsb-release

# 2. Install Docker & Docker Compose plugin
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker Engine & Docker Compose..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed successfully."
else
  echo "✅ Docker is already installed."
fi

# 3. Configure UFW Firewall (Only expose 22, 80, 443)
echo "🛡️  Configuring UFW firewall rules..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Caddy'
ufw allow 443/tcp comment 'HTTPS Caddy'
ufw allow 443/udp comment 'HTTP/3 QUIC Caddy'
ufw --force enable
echo "✅ Firewall active and secured."

# 4. Prepare Application Directory
DEPLOY_DIR="/opt/chekup247"
echo "📁 Setting up deployment directory at ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

# 5. Instructions for GitHub Secrets & Environment
echo ""
echo "===================================================================="
echo " VPS Bootstrap Complete!"
echo "===================================================================="
echo ""
echo "Next Steps to Complete Setup:"
echo ""
echo "1. Clone your repository into /opt/chekup247 or copy project files:"
echo "   git clone <YOUR_GITHUB_REPO_URL> /opt/chekup247"
echo ""
echo "2. Create your production environment file:"
echo "   cp /opt/chekup247/deploy/production.env.example /opt/chekup247/.env.production"
echo "   nano /opt/chekup247/.env.production"
echo "   (Fill in your secure production passwords, JWT_SECRET, and ADMIN_BOOTSTRAP_PASSWORD)"
echo ""
echo "3. Add GitHub Repository Secrets (in GitHub -> Settings -> Secrets and variables -> Actions):"
echo "   - VPS_HOST: 94.237.91.42"
echo "   - VPS_USER: root (or your VPS username)"
echo "   - VPS_SSH_KEY: (Private SSH key with access to your VPS)"
echo "   - VPS_SSH_PORT: 22"
echo "   - GHCR_PAT: (Personal Access Token with read:packages scope, if repo is private)"
echo ""
echo "4. First time start:"
echo "   cd /opt/chekup247"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "===================================================================="
