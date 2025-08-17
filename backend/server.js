const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');
require('dotenv').config();

const TempMailSMTPServer = require('./smtp-server');

const app = express();

// Configuration
const config = {
    port: process.env.PORT || 3000,
    smtpPort: process.env.SMTP_PORT || 25,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
    allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim()) : [],
    databasePath: process.env.DATABASE_PATH || './emails.db',
    emailExpirationHours: parseInt(process.env.EMAIL_EXPIRATION_HOURS) || 24,
    maxEmailsPerAddress: parseInt(process.env.MAX_EMAILS_PER_ADDRESS) || 50,
    cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 60,
    smtpAuthEnabled: process.env.SMTP_AUTH_ENABLED === 'true',
    smtpAuthUser: process.env.SMTP_AUTH_USER || '',
    smtpAuthPass: process.env.SMTP_AUTH_PASS || ''
};

// Database connection
const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_REQUESTS || 100,
    message: 'Too many requests from this IP'
});
app.use(limiter);

// Helper functions
const generateRandomEmail = (domain) => {
    const randomString = uuidv4().replace(/-/g, '').substring(0, 12);
    return `${randomString}@${domain}`;
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// API Routes

// Get available domains
app.get('/api/domains', (req, res) => {
    res.json({
        success: true,
        domains: config.allowedDomains
    });
});

// Generate new temporary email address
app.post('/api/email/generate', (req, res) => {
    const { domain } = req.body;
    
    // Validate domain
    if (!domain || !config.allowedDomains.includes(domain)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid or unauthorized domain'
        });
    }
    
    const email = generateRandomEmail(domain);
    const expiresAt = moment().add(config.emailExpirationHours, 'hours').toISOString();
    
    // Store the generated email address
    const stmt = db.prepare(`
        INSERT INTO email_addresses (address, domain, expires_at)
        VALUES (?, ?, ?)
    `);
    
    stmt.run([email, domain, expiresAt], function(err) {
        if (err) {
            console.error('Error storing email address:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate email address'
            });
        }
        
        res.json({
            success: true,
            email: email,
            expires_at: expiresAt
        });
    });
    
    stmt.finalize();
});

// Get random email without storing (for quick generation)
app.get('/api/email/random/:domain', (req, res) => {
    const { domain } = req.params;
    
    if (!config.allowedDomains.includes(domain)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid domain'
        });
    }
    
    const email = generateRandomEmail(domain);
    res.json({
        success: true,
        email: email
    });
});

// Get emails for a specific address
app.get('/api/emails/:email', (req, res) => {
    const { email } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    // Check if email domain is allowed
    const domain = email.split('@')[1];
    if (!config.allowedDomains.includes(domain)) {
        return res.status(400).json({
            success: false,
            error: 'Domain not allowed'
        });
    }
    
    // Update last accessed time
    const updateStmt = db.prepare(`
        UPDATE email_addresses 
        SET last_accessed = CURRENT_TIMESTAMP 
        WHERE address = ?
    `);
    updateStmt.run([email.toLowerCase()]);
    updateStmt.finalize();
    
    // Get emails
    const stmt = db.prepare(`
        SELECT id, email_id, sender, subject, body_text, body_html, 
               attachments, received_at, is_read
        FROM emails 
        WHERE recipient = ? AND expires_at > datetime('now')
        ORDER BY received_at DESC
        LIMIT ? OFFSET ?
    `);
    
    stmt.all([email.toLowerCase(), parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            console.error('Error fetching emails:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch emails'
            });
        }
        
        // Parse attachments JSON
        const emails = rows.map(row => ({
            ...row,
            attachments: row.attachments ? JSON.parse(row.attachments) : [],
            is_read: Boolean(row.is_read)
        }));
        
        res.json({
            success: true,
            emails: emails,
            count: emails.length
        });
    });
    
    stmt.finalize();
});

// Get specific email by ID
app.get('/api/email/:email/:emailId', (req, res) => {
    const { email, emailId } = req.params;
    
    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    const stmt = db.prepare(`
        SELECT * FROM emails 
        WHERE recipient = ? AND email_id LIKE ? AND expires_at > datetime('now')
        LIMIT 1
    `);
    
    stmt.get([email.toLowerCase(), `${emailId}%`], (err, row) => {
        if (err) {
            console.error('Error fetching email:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch email'
            });
        }
        
        if (!row) {
            return res.status(404).json({
                success: false,
                error: 'Email not found'
            });
        }
        
        // Mark as read
        const updateStmt = db.prepare(`UPDATE emails SET is_read = 1 WHERE id = ?`);
        updateStmt.run([row.id]);
        updateStmt.finalize();
        
        // Parse attachments
        const emailData = {
            ...row,
            attachments: row.attachments ? JSON.parse(row.attachments) : [],
            is_read: true
        };
        
        res.json({
            success: true,
            email: emailData
        });
    });
    
    stmt.finalize();
});

// Delete email
app.delete('/api/email/:email/:emailId', (req, res) => {
    const { email, emailId } = req.params;
    
    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    const stmt = db.prepare(`
        DELETE FROM emails 
        WHERE recipient = ? AND email_id LIKE ?
    `);
    
    stmt.run([email.toLowerCase(), `${emailId}%`], function(err) {
        if (err) {
            console.error('Error deleting email:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete email'
            });
        }
        
        res.json({
            success: true,
            deleted: this.changes > 0
        });
    });
    
    stmt.finalize();
});

// Get email statistics
app.get('/api/stats/:email', (req, res) => {
    const { email } = req.params;
    
    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email address'
        });
    }
    
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total_emails,
            COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_emails,
            MIN(received_at) as first_email,
            MAX(received_at) as last_email
        FROM emails 
        WHERE recipient = ? AND expires_at > datetime('now')
    `);
    
    stmt.get([email.toLowerCase()], (err, row) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch statistics'
            });
        }
        
        res.json({
            success: true,
            stats: row
        });
    });
    
    stmt.finalize();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Cleanup expired emails function
const cleanupExpiredEmails = () => {
    console.log('Running cleanup of expired emails...');
    
    const deleteEmails = db.prepare(`DELETE FROM emails WHERE expires_at <= datetime('now')`);
    const deleteAddresses = db.prepare(`DELETE FROM email_addresses WHERE expires_at <= datetime('now')`);
    
    deleteEmails.run(function(err) {
        if (err) {
            console.error('Error cleaning up expired emails:', err);
        } else if (this.changes > 0) {
            console.log(`Cleaned up ${this.changes} expired emails`);
        }
    });
    
    deleteAddresses.run(function(err) {
        if (err) {
            console.error('Error cleaning up expired addresses:', err);
        } else if (this.changes > 0) {
            console.log(`Cleaned up ${this.changes} expired addresses`);
        }
    });
    
    deleteEmails.finalize();
    deleteAddresses.finalize();
};

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start servers
const startServers = async () => {
    // Start HTTP API server
    app.listen(config.port, () => {
        console.log(`HTTP API Server listening on port ${config.port}`);
        console.log(`Allowed domains: ${config.allowedDomains.join(', ')}`);
    });
    
    // Start SMTP server
    const smtpServer = new TempMailSMTPServer(config);
    smtpServer.start();
    
    // Start cleanup interval
    const cleanupInterval = setInterval(cleanupExpiredEmails, config.cleanupIntervalMinutes * 60 * 1000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down servers...');
        clearInterval(cleanupInterval);
        db.close();
        process.exit(0);
    });
};

startServers().catch(console.error);
