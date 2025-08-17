# TempMail - Your Own Temporary Email Service

A complete, self-hosted temporary email service built with Node.js and SQLite. Generate disposable email addresses, receive emails, and automatically clean up expired messages.

## 🚀 Features

- **Generate Random Email Addresses**: Create unlimited temporary emails
- **Multiple Domain Support**: Use multiple domains for your service  
- **Real-time Email Reception**: SMTP server receives emails instantly
- **Web-based Interface**: Modern, responsive web UI
- **Auto-cleanup**: Automatically delete expired emails
- **Email Viewing**: Read emails with text/HTML support
- **Attachment Support**: Handle email attachments
- **REST API**: Full REST API for integration
- **Docker Ready**: Easy deployment with Docker
- **Rate Limiting**: Built-in protection against abuse
- **Mobile Responsive**: Works on all devices

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Email**: Custom SMTP server with mailparser
- **Deployment**: Docker, Docker Compose
- **Reverse Proxy**: Nginx (optional)

## 📁 Project Structure

```
tempmail-app/
├── backend/                 # Node.js backend server
│   ├── server.js           # Main API server
│   ├── smtp-server.js      # SMTP email receiver
│   ├── setup-database.js   # Database initialization
│   └── package.json        # Dependencies
├── frontend/               # Web interface
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styling
│   └── script.js           # JavaScript logic
├── config/                 # Configuration files
│   └── nginx.conf          # Nginx configuration
├── docs/                   # Documentation
│   └── SETUP.md           # Detailed setup guide
├── docker-compose.yml      # Docker deployment
└── Dockerfile             # Container configuration
```

## ⚡ Quick Start

### Prerequisites
- Node.js 18+ (for local development)
- Docker & Docker Compose (for deployment)
- A domain name and VPS (for production)

### Local Development

1. **Clone the repository**
   ```bash
   cd tempmail-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Initialize database**
   ```bash
   npm run setup-db
   ```

5. **Start the backend**
   ```bash
   npm run dev
   ```

6. **Serve the frontend** (in another terminal)
   ```bash
   cd ../frontend
   python -m http.server 8080
   ```

7. **Open your browser**
   ```
   http://localhost:8080
   ```

### Production Deployment

1. **Configure your domains** in `docker-compose.yml`

2. **Deploy with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Setup DNS records** for your domain (see [SETUP.md](docs/SETUP.md))

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP API port | `3000` |
| `SMTP_PORT` | SMTP server port | `25` |
| `ALLOWED_DOMAINS` | Comma-separated domain list | Required |
| `EMAIL_EXPIRATION_HOURS` | How long emails are kept | `24` |
| `MAX_EMAILS_PER_ADDRESS` | Max emails per temp address | `50` |
| `CLEANUP_INTERVAL_MINUTES` | Cleanup frequency | `60` |

### Domain Setup

You need to configure DNS records for your domains:

1. **A Record**: Point domain to your server IP
2. **MX Record**: Route emails to your server
3. **Wildcard A Record**: Handle all subdomains

See [docs/SETUP.md](docs/SETUP.md) for detailed instructions.

## 📧 API Endpoints

### Generate Email
```http
POST /api/email/generate
Content-Type: application/json

{
  "domain": "tempmail.yourdomain.com"
}
```

### Get Emails
```http
GET /api/emails/{email_address}
```

### Get Specific Email
```http
GET /api/email/{email_address}/{email_id}
```

### Delete Email
```http
DELETE /api/email/{email_address}/{email_id}
```

### Get Statistics
```http
GET /api/stats/{email_address}
```

## 🎯 Use Cases

- **Testing**: Test email functionality without using real addresses
- **Privacy**: Sign up for services without exposing your real email
- **Development**: Email testing during application development
- **Temporary Access**: One-time access to services
- **API Testing**: Automated testing of email-dependent features

## 🔒 Security Features

- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Cross-origin request protection
- **Input Validation**: Sanitize all user inputs
- **Auto Cleanup**: Remove expired data automatically
- **Secure Headers**: Security headers in all responses

## 🌐 Domain Management

The system supports multiple domains for better availability:

- Rotate between domains if one gets blocked
- Use different domains for different purposes
- Wildcard support for unlimited subdomains

## 📱 Frontend Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Auto-refresh email list
- **Copy to Clipboard**: Easy email address copying
- **Modal Email Viewer**: Full-screen email reading
- **Attachment Handling**: View attachment details
- **Toast Notifications**: User-friendly feedback

## 🐳 Docker Deployment

### Simple Deployment
```bash
docker-compose up -d
```

### Production with Nginx
```bash
docker-compose --profile production up -d
```

### Scaling
```bash
docker-compose up -d --scale tempmail=3
```

## 📈 Monitoring

- **Health Check Endpoint**: `/api/health`
- **Application Logs**: Docker compose logs
- **Email Statistics**: Built-in stats tracking
- **Database Size**: Monitor storage usage

## 🔧 Customization

### Frontend Customization
- Edit `frontend/style.css` for styling
- Modify `frontend/index.html` for structure
- Update `frontend/script.js` for functionality

### Backend Customization  
- Extend API in `backend/server.js`
- Modify SMTP handling in `backend/smtp-server.js`
- Add new database tables in `backend/setup-database.js`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Important Notes

- **Port 25**: Many VPS providers block port 25 by default
- **DNS Propagation**: DNS changes can take up to 48 hours
- **Email Deliverability**: Setup SPF/DMARC records for better delivery
- **Resource Usage**: Monitor disk space for email storage
- **Legal Compliance**: Ensure compliance with local email regulations

## 🆘 Support

- **Setup Issues**: Check [docs/SETUP.md](docs/SETUP.md)
- **Troubleshooting**: See troubleshooting section in setup guide
- **Feature Requests**: Open an issue on GitHub

## 🎉 Credits

Built with ❤️ for developers who need reliable temporary email testing.
