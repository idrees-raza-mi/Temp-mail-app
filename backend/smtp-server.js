const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class TempMailSMTPServer {
    constructor(config) {
        this.config = config;
        this.db = new sqlite3.Database(config.databasePath);
        this.allowedDomains = config.allowedDomains || [];
    }

    start() {
        const server = new SMTPServer({
            name: 'TempMail Server',
            banner: 'TempMail SMTP Server',
            allowInsecureAuth: true,
            authOptional: true,
            
            // Handle authentication (optional for production)
            onAuth: (auth, session, callback) => {
                if (!this.config.smtpAuthEnabled) {
                    return callback(null, { user: 'anonymous' });
                }
                
                if (auth.username === this.config.smtpAuthUser && 
                    auth.password === this.config.smtpAuthPass) {
                    return callback(null, { user: auth.username });
                }
                
                return callback(new Error('Invalid username or password'));
            },

            // Handle mail from validation
            onMailFrom: (address, session, callback) => {
                console.log(`MAIL FROM: ${address.address}`);
                callback();
            },

            // Handle recipient validation
            onRcptTo: (address, session, callback) => {
                const email = address.address.toLowerCase();
                const domain = email.split('@')[1];
                
                console.log(`RCPT TO: ${email} (domain: ${domain})`);
                
                // Check if domain is allowed
                if (this.allowedDomains.length > 0 && !this.allowedDomains.includes(domain)) {
                    console.log(`Rejected domain: ${domain}`);
                    return callback(new Error('Domain not allowed'));
                }
                
                callback();
            },

            // Handle message data
            onData: (stream, session, callback) => {
                this.handleIncomingEmail(stream, session, callback);
            }
        });

        server.listen(this.config.smtpPort, () => {
            console.log(`SMTP Server listening on port ${this.config.smtpPort}`);
        });

        server.on('error', (err) => {
            console.error('SMTP Server error:', err);
        });

        return server;
    }

    async handleIncomingEmail(stream, session, callback) {
        try {
            const parsed = await simpleParser(stream);
            const emailId = uuidv4();
            
            // Extract recipient info
            const recipients = session.envelope.rcptTo.map(addr => addr.address.toLowerCase());
            
            console.log(`Processing email: ${parsed.subject} to ${recipients.join(', ')}`);
            
            // Process each recipient
            for (const recipient of recipients) {
                await this.storeEmail(emailId, recipient, parsed);
            }
            
            callback();
        } catch (error) {
            console.error('Error processing email:', error);
            callback(error);
        }
    }

    storeEmail(emailId, recipient, parsed) {
        return new Promise((resolve, reject) => {
            const expiresAt = moment().add(this.config.emailExpirationHours, 'hours').toISOString();
            
            // Process attachments
            const attachments = parsed.attachments ? JSON.stringify(
                parsed.attachments.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    content: att.content ? att.content.toString('base64') : null
                }))
            ) : null;

            const stmt = this.db.prepare(`
                INSERT INTO emails (
                    email_id, recipient, sender, subject, 
                    body_text, body_html, attachments, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run([
                `${emailId}-${recipient}`,
                recipient,
                parsed.from?.text || 'unknown@sender.com',
                parsed.subject || 'No Subject',
                parsed.text || '',
                parsed.html || '',
                attachments,
                expiresAt
            ], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    reject(err);
                } else {
                    console.log(`Email stored for ${recipient} (ID: ${this.lastID})`);
                    resolve(this.lastID);
                }
            });

            stmt.finalize();
        });
    }

    // Update email address last accessed time
    updateAddressAccess(address) {
        const stmt = this.db.prepare(`
            UPDATE email_addresses 
            SET last_accessed = CURRENT_TIMESTAMP 
            WHERE address = ?
        `);
        
        stmt.run([address.toLowerCase()], (err) => {
            if (err) {
                console.error('Error updating address access:', err);
            }
        });
        
        stmt.finalize();
    }
}

module.exports = TempMailSMTPServer;
