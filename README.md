# Email Writing Assistant - Backend API 🚀

Node.js Express server that proxies requests to the Anthropic Claude API for email generation.

![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🌟 Features

- **Claude API Integration** - Connects to Anthropic's Claude Sonnet 4.5
- **CORS Support** - Configurable cross-origin resource sharing
- **Rate Limiting** - Built-in protection against abuse (20 req/min per IP)
- **Error Handling** - Graceful error responses
- **Production Ready** - Systemd service, Nginx integration, SSL support
- **Logging** - Request logging for monitoring
- **Health Check** - `/health` endpoint for monitoring

## 🏗️ Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **CORS** - Cross-origin handling
- **dotenv** - Environment configuration
- **Nginx** - Reverse proxy (production)
- **systemd** - Process management (production)

## 📋 Prerequisites

### For Local Development
- Node.js 18.x or higher
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### For Production
- Debian/Ubuntu server with root/sudo access
- Node.js 18.x or higher
- Nginx
- Domain name (recommended for SSL)

## 💻 Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/email-writer-backend.git
cd email-writer-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Start the Server

```bash
npm start
```

Server will run on `http://localhost:3001`

### 5. Test the API

```bash
# Health check
curl http://localhost:3001/health

# Test email generation
curl -X POST http://localhost:3001/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a professional email thanking someone for their time"}'
```

## 📡 API Endpoints

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "message": "Email Writer API is running",
  "timestamp": "2025-11-17T12:00:00.000Z"
}
```

### `POST /api/generate`
Generate an email from a prompt

**Request:**
```json
{
  "prompt": "Your detailed prompt here including tone, context, etc."
}
```

**Response:**
```json
{
  "text": "Generated email content here..."
}
```

**Error Response:**
```json
{
  "error": "Error message here"
}
```

## 🚀 Production Deployment (Debian/Ubuntu)

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify installations
node --version  # Should be v20.x
npm --version
nginx -v
```

### Step 2: Set Up Application

```bash
# Create directory
sudo mkdir -p /var/www/email-writer-backend
sudo chown -R $USER:$USER /var/www/email-writer-backend
cd /var/www/email-writer-backend

# Clone repository
git clone https://github.com/yourusername/email-writer-backend.git .

# Install dependencies
npm install --production
```

### Step 3: Configure Environment

```bash
# Create .env file
nano .env
```

Add your production configuration:

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.pages.dev
```

**Security Note:** Use specific domain instead of `*` for `ALLOWED_ORIGINS` in production.

### Step 4: Create Systemd Service

```bash
sudo nano /etc/systemd/system/email-writer-api.service
```

Add this configuration:

```ini
[Unit]
Description=Email Writing Assistant API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/email-writer-backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=email-writer-api

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable email-writer-api

# Start the service
sudo systemctl start email-writer-api

# Check status
sudo systemctl status email-writer-api

# View logs
sudo journalctl -u email-writer-api -f
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/email-writer-api
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    access_log /var/log/nginx/email-writer-api-access.log;
    error_log /var/log/nginx/email-writer-api-error.log;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/email-writer-api /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Follow the prompts - Certbot will auto-configure HTTPS!

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 7: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 8: Verify Deployment

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# Should return: {"status":"ok"...}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Example | Default |
|----------|----------|-------------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key | `sk-ant-api03-...` | - |
| `PORT` | No | Server port | `3001` | `3001` |
| `NODE_ENV` | No | Environment mode | `production` | `development` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins | `https://app.pages.dev` | `http://localhost:3000` |

### CORS Configuration

**Allow single origin:**
```env
ALLOWED_ORIGINS=https://your-app.pages.dev
```

**Allow multiple origins (comma-separated):**
```env
ALLOWED_ORIGINS=https://your-app.pages.dev,https://www.yourdomain.com
```

**Allow all origins (not recommended for production):**
```env
ALLOWED_ORIGINS=*
```

### Rate Limiting

The server includes built-in rate limiting:
- **20 requests per minute** per IP address
- Configurable in `server.js`
- Returns 429 status when limit exceeded

## 📊 Monitoring

### Check Service Status

```bash
sudo systemctl status email-writer-api
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u email-writer-api -f

# Last 100 lines
sudo journalctl -u email-writer-api -n 100

# Logs from today
sudo journalctl -u email-writer-api --since today

# Search for errors
sudo journalctl -u email-writer-api | grep error
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/email-writer-api-access.log

# Error logs
sudo tail -f /var/log/nginx/email-writer-api-error.log
```

### API Usage Monitoring

Monitor your Anthropic API usage at:
https://console.anthropic.com/settings/usage

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
sudo journalctl -u email-writer-api -n 50

# Try manual start to see errors
cd /var/www/email-writer-backend
node server.js

# Check if port is in use
sudo netstat -tlnp | grep 3001
```

### CORS Errors

1. Verify `ALLOWED_ORIGINS` in `.env` matches frontend URL exactly
2. Restart service: `sudo systemctl restart email-writer-api`
3. Check nginx isn't adding duplicate CORS headers
4. Try `ALLOWED_ORIGINS=*` temporarily for testing

### API Key Issues

1. Verify key at https://console.anthropic.com/
2. Check no extra spaces or quotes in `.env`
3. Ensure key has sufficient credits
4. Restart service after changing `.env`

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx SSL config
sudo nginx -t
```

### High Memory Usage

```bash
# Check memory usage
free -h

# Restart service
sudo systemctl restart email-writer-api
```

## 🔄 Updating

```bash
# SSH into server
ssh your-user@your-server

# Navigate to directory
cd /var/www/email-writer-backend

# Pull latest changes
git pull

# Install any new dependencies
npm install --production

# Restart service
sudo systemctl restart email-writer-api

# Verify it's running
sudo systemctl status email-writer-api
```

## 🔒 Security Best Practices

1. **Protect API Key**
    - Never commit `.env` to Git
    - Use environment variables only
    - Rotate keys if exposed

2. **Use HTTPS**
    - Always use SSL in production
    - Let's Encrypt provides free certificates
    - Force HTTPS redirect

3. **Restrict CORS**
    - Use specific domains, not `*`
    - Update when frontend URL changes

4. **Monitor Usage**
    - Set up alerts in Anthropic console
    - Monitor API costs
    - Watch for unusual traffic

5. **Keep Updated**
    - Regularly update dependencies: `npm audit fix`
    - Update Node.js and system packages
    - Monitor security advisories

6. **Firewall**
    - Only open necessary ports (80, 443)
    - Use UFW or iptables
    - Consider fail2ban for brute force protection

## 📁 Project Structure

```
email-writer-backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related

- **Frontend Repository**: [email-writing-assistant](https://github.com/yourusername/email-writing-assistant)
- **Anthropic API Documentation**: [https://docs.anthropic.com](https://docs.anthropic.com)

## 📧 Support

- **Issues**: Use GitHub Issues for bug reports
- **Security Issues**: Email security@yourdomain.com
- **Questions**: Use GitHub Discussions

## 💰 API Costs

This backend uses the Anthropic Claude API (pay-as-you-go):

- **Claude Sonnet 4**: ~$3 per million input tokens, ~$15 per million output tokens
- **Typical email**: 500-1000 tokens
- **Cost per email**: $0.01-0.02

Set up usage alerts at: https://console.anthropic.com/settings/usage

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) - Claude API
- [Express](https://expressjs.com/) - Web framework
- Community contributors

---

**Built with ❤️ using Claude AI**

⭐️ Star this repo if it helped you!