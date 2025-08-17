const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuration
const config = {
    port: process.env.PORT || 3000,
    allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',').map(d => d.trim()) : [],
    databasePath: process.env.DATABASE_PATH || './emails.db',
    emailExpirationHours: parseInt(process.env.EMAIL_EXPIRATION_HOURS) || 24
};

console.log('Starting TempMail test server...');
console.log('Config:', config);

// Database connection
const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('✓ Connected to SQLite database');
});

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper functions
const generateRandomEmail = (domain) => {
    const randomString = uuidv4().replace(/-/g, '').substring(0, 12);
    return `${randomString}@${domain}`;
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'TempMail API is working!',
        timestamp: new Date().toISOString(),
        config: {
            allowedDomains: config.allowedDomains,
            emailExpirationHours: config.emailExpirationHours
        }
    });
});

// Get available domains
app.get('/api/domains', (req, res) => {
    console.log('GET /api/domains - Returning domains:', config.allowedDomains);
    res.json({
        success: true,
        domains: config.allowedDomains
    });
});

// Generate new temporary email address
app.post('/api/email/generate', (req, res) => {
    const { domain } = req.body;
    
    console.log('POST /api/email/generate - Domain:', domain);
    
    // Validate domain
    if (!domain || !config.allowedDomains.includes(domain)) {
        console.log('Invalid domain:', domain, 'Allowed:', config.allowedDomains);
        return res.status(400).json({
            success: false,
            error: 'Invalid or unauthorized domain'
        });
    }
    
    const email = generateRandomEmail(domain);
    const expiresAt = moment().add(config.emailExpirationHours, 'hours').toISOString();
    
    console.log('Generated email:', email);
    
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
        
        console.log('✓ Email stored successfully');
        res.json({
            success: true,
            email: email,
            expires_at: expiresAt
        });
    });
    
    stmt.finalize();
});

// Get emails for a specific address
app.get('/api/emails/:email', (req, res) => {
    const { email } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log('GET /api/emails - Email:', email);
    
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
        
        console.log('Found emails:', rows.length);
        
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

// Add a test email to the database (for testing purposes)
app.post('/api/test/email', (req, res) => {
    const { email } = req.body;
    
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'Valid email address required'
        });
    }
    
    const emailId = uuidv4();
    const expiresAt = moment().add(config.emailExpirationHours, 'hours').toISOString();
    
    const stmt = db.prepare(`
        INSERT INTO emails (
            email_id, recipient, sender, subject, 
            body_text, body_html, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
        `${emailId}-${email}`,
        email.toLowerCase(),
        'test@example.com',
        'Test Email - Welcome to TempMail!',
        'This is a test email to verify that your temporary email service is working correctly.\n\nYou can view this email in your inbox and test all the features.\n\nBest regards,\nTempMail Test System',
        '<html><body><h2>Test Email - Welcome to TempMail!</h2><p>This is a test email to verify that your temporary email service is working correctly.</p><p>You can view this email in your inbox and test all the features.</p><p><strong>Best regards,</strong><br>TempMail Test System</p></body></html>',
        expiresAt
    ], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to create test email'
            });
        } else {
            console.log(`✓ Test email created for ${email}`);
            res.json({
                success: true,
                message: 'Test email created successfully',
                emailId: emailId
            });
        }
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

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(config.port, () => {
    console.log(`✓ HTTP API Server listening on port ${config.port}`);
    console.log(`✓ Allowed domains: ${config.allowedDomains.join(', ')}`);
    console.log(`✓ Frontend available at: http://localhost:${config.port}`);
    console.log(`✓ API test available at: http://localhost:${config.port}/api/test`);
    console.log('\n--- TempMail server is ready! ---\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close();
    process.exit(0);
});
