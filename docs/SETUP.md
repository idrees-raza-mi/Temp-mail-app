# TempMail Setup Guide

## Overview
This guide will help you set up your own temporary email service with your purchased domains.

## Prerequisites
- A VPS/server with Docker installed
- Domain(s) for your temp mail service
- Basic knowledge of DNS configuration

## Step 1: Domain Purchase and DNS Setup

### 1.1 Purchase Domains
Buy one or more domains for your temp mail service. Good options:
- `tempmail-yourname.com`
- `disposable-mail.net`
- `temp-email.org`

### 1.2 DNS Configuration

For each domain, you need to set up these DNS records:

#### A Records
Point your domain to your server IP:
```
@ (root)           A    YOUR_SERVER_IP
* (wildcard)       A    YOUR_SERVER_IP
mail               A    YOUR_SERVER_IP
www                A    YOUR_SERVER_IP
```

#### MX Record (Mail Exchange)
This is crucial for receiving emails:
```
@ (root)           MX   10   mail.yourdomain.com.
```

#### TXT Records (Optional but recommended)
For better deliverability:
```
@ (root)           TXT  "v=spf1 ip4:YOUR_SERVER_IP ~all"
_dmarc             TXT  "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

#### Example DNS Configuration for `tempmail.example.com`:
```
tempmail.example.com.      A      192.168.1.100
*.tempmail.example.com.    A      192.168.1.100
mail.tempmail.example.com. A      192.168.1.100
tempmail.example.com.      MX 10  mail.tempmail.example.com.
tempmail.example.com.      TXT    "v=spf1 ip4:192.168.1.100 ~all"
```

## Step 2: Server Setup

### 2.1 Install Docker and Docker Compose
```bash
# Update system
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.2 Clone/Upload Your App
```bash
# Upload your tempmail-app folder to the server
# Or use git if you've pushed it to a repository
```

## Step 3: Configuration

### 3.1 Environment Configuration
Copy and edit the environment file:
```bash
cd tempmail-app/backend
cp .env.example .env
```

Edit `.env` file with your domains:
```env
PORT=3000
SMTP_PORT=25
FRONTEND_URL=https://tempmail.yourdomain.com
ALLOWED_DOMAINS=tempmail.yourdomain.com,disposable.yourdomain.com,temp.yourdomain.com
DATABASE_PATH=./data/emails.db
EMAIL_EXPIRATION_HOURS=24
MAX_EMAILS_PER_ADDRESS=50
CLEANUP_INTERVAL_MINUTES=60
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MINUTES=15
```

### 3.2 Update Docker Compose
Edit `docker-compose.yml` and update the domains:
```yaml
environment:
  - ALLOWED_DOMAINS=tempmail.yourdomain.com,disposable.yourdomain.com
  - FRONTEND_URL=https://tempmail.yourdomain.com
```

## Step 4: SSL Certificate Setup (Production)

### 4.1 Install Certbot
```bash
sudo apt install certbot
```

### 4.2 Get SSL Certificate
```bash
# Stop any running web servers
sudo systemctl stop apache2 nginx

# Get certificate for your domain
sudo certbot certonly --standalone -d tempmail.yourdomain.com -d www.tempmail.yourdomain.com

# Certificates will be stored in /etc/letsencrypt/live/tempmail.yourdomain.com/
```

### 4.3 Setup Certificate Auto-Renewal
```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 2 * * * certbot renew --quiet && docker-compose restart nginx
```

## Step 5: Deployment

### 5.1 Development Mode
```bash
# Setup database
cd tempmail-app/backend
npm install
npm run setup-db

# Start development servers
npm run dev

# In another terminal, serve frontend
cd ../frontend
python -m http.server 8080
```

### 5.2 Production Deployment

#### Option A: Simple Docker Deployment
```bash
cd tempmail-app

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### Option B: Production with Nginx
```bash
# Update nginx config with your domain
vim config/nginx.conf

# Create SSL directory and copy certificates
sudo mkdir -p config/ssl
sudo cp /etc/letsencrypt/live/tempmail.yourdomain.com/* config/ssl/

# Start with production profile
docker-compose --profile production up -d
```

## Step 6: Firewall Configuration

### 6.1 Open Required Ports
```bash
# For Ubuntu/Debian with ufw
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# For CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-port=25/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## Step 7: Testing

### 7.1 Test DNS Resolution
```bash
# Check A record
nslookup tempmail.yourdomain.com

# Check MX record
nslookup -type=MX tempmail.yourdomain.com
```

### 7.2 Test SMTP
```bash
# Test SMTP connection
telnet tempmail.yourdomain.com 25

# Should connect and show SMTP banner
```

### 7.3 Test Web Interface
1. Visit `https://tempmail.yourdomain.com`
2. Generate a temporary email
3. Send a test email to it
4. Check if it appears in the inbox

## Step 8: Monitoring and Maintenance

### 8.1 Check Application Logs
```bash
# View application logs
docker-compose logs -f tempmail

# View Nginx logs (if using)
docker-compose logs -f nginx
```

### 8.2 Database Backup (Optional)
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec tempmail_tempmail_1 sqlite3 /app/data/emails.db ".backup /app/data/backup_$DATE.db"
echo "Backup created: backup_$DATE.db"
EOF

chmod +x backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

1. **Emails not received**
   - Check MX record configuration
   - Verify port 25 is open
   - Check application logs

2. **Web interface not loading**
   - Verify DNS A record
   - Check if port 80/443 are accessible
   - Verify SSL certificate

3. **SMTP connection refused**
   - Check if port 25 is blocked by hosting provider
   - Some VPS providers block port 25 by default

4. **High memory usage**
   - Adjust cleanup interval in configuration
   - Monitor database size

### Log Locations
- Application logs: `docker-compose logs tempmail`
- Nginx logs: `docker-compose logs nginx`
- System mail logs: `/var/log/mail.log`

## Security Considerations

1. **Firewall**: Only open necessary ports
2. **SSL**: Always use HTTPS in production
3. **Rate Limiting**: Configured in Nginx
4. **Regular Updates**: Keep Docker images updated
5. **Monitoring**: Set up monitoring for suspicious activity

## Performance Optimization

1. **Database**: Consider PostgreSQL for high volume
2. **Caching**: Add Redis for session management
3. **Load Balancing**: Use multiple instances behind load balancer
4. **CDN**: Use CDN for static assets

## Support

For issues or questions:
1. Check application logs first
2. Verify DNS configuration
3. Test SMTP connectivity
4. Check firewall settings

Your temporary email service should now be running at your domain!
