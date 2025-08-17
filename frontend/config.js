// Configuration for different environments
const config = {
    development: {
        apiBase: 'http://localhost:3000/api'
    },
    production: {
        // This will be automatically updated based on deployment
        apiBase: window.location.origin + '/api'
    }
};

// Auto-detect environment
const environment = window.location.hostname === 'localhost' ? 'development' : 'production';

// Export config
window.TEMPMAIL_CONFIG = config[environment];
