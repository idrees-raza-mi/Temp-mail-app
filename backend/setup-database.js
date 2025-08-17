const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './emails.db';

console.log('Setting up database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Create tables
const createTables = async () => {
    try {
        // Emails table
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS emails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email_id TEXT UNIQUE NOT NULL,
                    recipient TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    subject TEXT,
                    body_text TEXT,
                    body_html TEXT,
                    attachments TEXT,
                    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    is_read BOOLEAN DEFAULT 0
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating emails table:', err);
                    reject(err);
                } else {
                    console.log('✓ Emails table created');
                    resolve();
                }
            });
        });

        // Email addresses table
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS email_addresses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    address TEXT UNIQUE NOT NULL,
                    domain TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating email_addresses table:', err);
                    reject(err);
                } else {
                    console.log('✓ Email addresses table created');
                    resolve();
                }
            });
        });

        // Create indexes
        await new Promise((resolve) => {
            db.run('CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient)', resolve);
        });
        await new Promise((resolve) => {
            db.run('CREATE INDEX IF NOT EXISTS idx_emails_expires ON emails(expires_at)', resolve);
        });
        await new Promise((resolve) => {
            db.run('CREATE INDEX IF NOT EXISTS idx_addresses_address ON email_addresses(address)', resolve);
        });
        await new Promise((resolve) => {
            db.run('CREATE INDEX IF NOT EXISTS idx_addresses_expires ON email_addresses(expires_at)', resolve);
        });
        
        console.log('✓ Database indexes created');
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('✓ Database setup completed successfully');
            }
        });
        
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
};

createTables();
