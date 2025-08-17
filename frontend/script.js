class TempMailApp {
    constructor() {
        this.apiBase = window.TEMPMAIL_CONFIG ? window.TEMPMAIL_CONFIG.apiBase : 'http://localhost:3000/api';
        this.currentEmail = null;
        this.autoRefreshInterval = null;
        this.domains = [];
        
        this.init();
    }

    async init() {
        await this.loadDomains();
        this.bindEvents();
        this.showToast('Welcome to TempMail!', 'info');
    }

    // API Methods
    async loadDomains() {
        try {
            const response = await fetch(`${this.apiBase}/domains`);
            const data = await response.json();
            
            if (data.success) {
                this.domains = data.domains;
                this.populateDomainSelect();
            } else {
                throw new Error('Failed to load domains');
            }
        } catch (error) {
            console.error('Error loading domains:', error);
            this.showToast('Failed to load available domains', 'error');
        }
    }

    async generateEmail() {
        const domain = document.getElementById('domainSelect').value;
        
        if (!domain) {
            this.showToast('Please select a domain first', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/email/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ domain })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentEmail = data.email;
                this.updateEmailDisplay(data.email, data.expires_at);
                this.showToast('Email generated successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to generate email');
            }
        } catch (error) {
            console.error('Error generating email:', error);
            this.showToast(error.message, 'error');
        }
    }

    async loadEmails() {
        if (!this.currentEmail) return;

        const loadingEl = document.getElementById('loadingEmails');
        const noEmailsEl = document.getElementById('noEmails');
        
        loadingEl.style.display = 'block';
        noEmailsEl.style.display = 'none';

        try {
            const response = await fetch(`${this.apiBase}/emails/${encodeURIComponent(this.currentEmail)}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayEmails(data.emails);
                this.updateEmailStats();
            } else {
                throw new Error(data.error || 'Failed to load emails');
            }
        } catch (error) {
            console.error('Error loading emails:', error);
            this.showToast('Failed to load emails', 'error');
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    async loadEmailStats() {
        if (!this.currentEmail) return;

        try {
            const response = await fetch(`${this.apiBase}/stats/${encodeURIComponent(this.currentEmail)}`);
            const data = await response.json();
            
            if (data.success) {
                const stats = data.stats;
                document.getElementById('totalEmails').textContent = stats.total_emails;
                document.getElementById('unreadEmails').textContent = stats.unread_emails;
                document.getElementById('emailCount').textContent = stats.total_emails;
                
                if (stats.total_emails > 0) {
                    document.getElementById('emailStats').style.display = 'flex';
                }
            }
        } catch (error) {
            console.error('Error loading email stats:', error);
        }
    }

    async loadEmailDetails(emailId) {
        if (!this.currentEmail) return;

        try {
            const response = await fetch(`${this.apiBase}/email/${encodeURIComponent(this.currentEmail)}/${emailId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showEmailModal(data.email);
            } else {
                throw new Error(data.error || 'Failed to load email details');
            }
        } catch (error) {
            console.error('Error loading email details:', error);
            this.showToast('Failed to load email details', 'error');
        }
    }

    async deleteEmail(emailId) {
        if (!this.currentEmail || !confirm('Are you sure you want to delete this email?')) return;

        try {
            const response = await fetch(`${this.apiBase}/email/${encodeURIComponent(this.currentEmail)}/${emailId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Email deleted successfully', 'success');
                this.closeModal();
                this.loadEmails();
            } else {
                throw new Error(data.error || 'Failed to delete email');
            }
        } catch (error) {
            console.error('Error deleting email:', error);
            this.showToast('Failed to delete email', 'error');
        }
    }

    // UI Methods
    populateDomainSelect() {
        const select = document.getElementById('domainSelect');
        select.innerHTML = '<option value="">Choose a domain...</option>';
        
        this.domains.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain;
            option.textContent = domain;
            select.appendChild(option);
        });
    }

    updateEmailDisplay(email, expiresAt) {
        document.getElementById('currentEmail').value = email;
        document.getElementById('currentEmailAddress').textContent = email;
        
        if (expiresAt) {
            const expireDate = new Date(expiresAt);
            document.getElementById('expirationTime').textContent = expireDate.toLocaleString();
        }
        
        document.getElementById('emailInfo').style.display = 'flex';
        document.getElementById('checkEmailsBtn').disabled = false;
    }

    displayEmails(emails) {
        const container = document.getElementById('emailContainer');
        const loadingEl = document.getElementById('loadingEmails');
        const noEmailsEl = document.getElementById('noEmails');
        
        // Remove existing email items
        container.querySelectorAll('.email-item').forEach(item => item.remove());
        
        if (emails.length === 0) {
            noEmailsEl.style.display = 'block';
            return;
        }
        
        noEmailsEl.style.display = 'none';
        
        emails.forEach(email => {
            const emailItem = this.createEmailItem(email);
            container.insertBefore(emailItem, loadingEl);
        });
    }

    createEmailItem(email) {
        const item = document.createElement('div');
        item.className = `email-item ${!email.is_read ? 'unread' : ''}`;
        item.onclick = () => this.loadEmailDetails(email.email_id.split('-')[0]);
        
        const date = new Date(email.received_at);
        const preview = email.body_text ? email.body_text.substring(0, 100) + '...' : 'No text content';
        
        item.innerHTML = `
            <div class="email-header">
                <span class="email-sender">${this.escapeHtml(email.sender)}</span>
                <span class="email-date">${date.toLocaleString()}</span>
            </div>
            <div class="email-subject">${this.escapeHtml(email.subject || 'No Subject')}</div>
            <div class="email-preview">${this.escapeHtml(preview)}</div>
        `;
        
        return item;
    }

    showEmailModal(email) {
        const modal = document.getElementById('emailModal');
        const currentEmailId = email.email_id.split('-')[0];
        
        // Update modal content
        document.getElementById('emailSubject').textContent = email.subject || 'No Subject';
        document.getElementById('emailFrom').textContent = email.sender;
        document.getElementById('emailTo').textContent = email.recipient;
        document.getElementById('emailDate').textContent = new Date(email.received_at).toLocaleString();
        
        // Update body content
        document.getElementById('emailTextBody').textContent = email.body_text || 'No text content';
        
        const htmlFrame = document.getElementById('emailHtmlBody');
        if (email.body_html) {
            htmlFrame.srcdoc = email.body_html;
        } else {
            htmlFrame.srcdoc = '<p>No HTML content</p>';
        }
        
        // Handle attachments
        const attachmentsEl = document.getElementById('emailAttachments');
        const attachmentsList = document.getElementById('attachmentsList');
        
        if (email.attachments && email.attachments.length > 0) {
            attachmentsList.innerHTML = '';
            email.attachments.forEach(attachment => {
                const attachmentItem = document.createElement('div');
                attachmentItem.className = 'attachment-item';
                attachmentItem.innerHTML = `
                    <i class="fas fa-paperclip attachment-icon"></i>
                    <span>${this.escapeHtml(attachment.filename)}</span>
                    <small>(${this.formatFileSize(attachment.size)})</small>
                `;
                attachmentsList.appendChild(attachmentItem);
            });
            attachmentsEl.style.display = 'block';
        } else {
            attachmentsEl.style.display = 'none';
        }
        
        // Set up delete button
        document.getElementById('deleteEmailBtn').onclick = () => this.deleteEmail(currentEmailId);
        
        // Show modal
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('emailModal').classList.remove('active');
    }

    async updateEmailStats() {
        await this.loadEmailStats();
    }

    copyEmailToClipboard() {
        if (!this.currentEmail) {
            this.showToast('No email to copy', 'error');
            return;
        }
        
        const emailInput = document.getElementById('currentEmail');
        emailInput.select();
        document.execCommand('copy');
        
        this.showToast('Email copied to clipboard!', 'success');
    }

    toggleAutoRefresh() {
        const btn = document.getElementById('autoRefreshBtn');
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            btn.classList.remove('auto-refresh-active');
            this.showToast('Auto-refresh disabled', 'info');
        } else {
            this.autoRefreshInterval = setInterval(() => {
                this.loadEmails();
            }, 30000); // 30 seconds
            btn.classList.add('auto-refresh-active');
            this.showToast('Auto-refresh enabled (30s)', 'success');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    // Event Handlers
    bindEvents() {
        // Generate email button
        document.getElementById('generateBtn').onclick = () => this.generateEmail();
        
        // Refresh email button
        document.getElementById('refreshBtn').onclick = () => this.generateEmail();
        
        // Copy email button
        document.getElementById('copyBtn').onclick = () => this.copyEmailToClipboard();
        
        // Check emails button
        document.getElementById('checkEmailsBtn').onclick = () => {
            document.getElementById('emailListSection').style.display = 'block';
            this.loadEmails();
        };
        
        // Refresh emails button
        document.getElementById('refreshEmailsBtn').onclick = () => this.loadEmails();
        
        // Auto refresh toggle
        document.getElementById('autoRefreshBtn').onclick = () => this.toggleAutoRefresh();
        
        // Modal close events
        document.getElementById('closeModal').onclick = () => this.closeModal();
        document.getElementById('emailModal').onclick = (e) => {
            if (e.target.id === 'emailModal') {
                this.closeModal();
            }
        };
        
        // Tab switching in modal
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.dataset.tab);
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Enter key in domain select
        document.getElementById('domainSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('generateBtn').focus();
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Content`).classList.add('active');
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tempMailApp = new TempMailApp();
});
