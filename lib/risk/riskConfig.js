'use strict';

module.exports = {
    THRESHOLDS: {
        LOW: 0,
        MEDIUM: 40,
        HIGH: 65,
        BLOCK: 80
    },
    WEIGHTS: {
        HONEYPOT: 85,
        RAPID_SUBMISSION: 45,
        INVALID_PHONE: 50,
        RATE_LIMIT: 55,
        REPEATED_PHONE: 40,
        WATCHLIST: 90
    },
    MIN_FORM_SECONDS: 3.0,
    RATE_LIMIT_WINDOW_HOURS: 24,
    RATE_LIMIT_MAX_ORDERS: 2,
    PHONE_REGEX: /^0[567]\d{8}$/
};
