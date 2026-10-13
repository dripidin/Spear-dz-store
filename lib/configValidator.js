'use strict';

const fs = require('fs');
const path = require('path');

function validateStoreConfig(configPath) {
    const resolvedPath = configPath || path.join(__dirname, '..', 'config', 'store.config.json');
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Store configuration file not found at: ${resolvedPath}`);
    }

    let raw;
    try {
        raw = fs.readFileSync(resolvedPath, 'utf8');
    } catch (err) {
        throw new Error(`Failed to read store configuration: ${err.message}`);
    }

    let config;
    try {
        config = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Invalid JSON syntax in store configuration: ${err.message}`);
    }

    const errors = [];

    // Store identity
    if (!config.store || typeof config.store !== 'object') {
        errors.push("Missing 'store' object");
    } else {
        if (!config.store.id) errors.push("store.id is required");
        if (!config.store.name_ar) errors.push("store.name_ar is required");
        if (!config.store.phone) errors.push("store.phone is required");
    }

    // Bundle details
    if (!config.bundle || typeof config.bundle !== 'object') {
        errors.push("Missing 'bundle' object");
    } else {
        if (!config.bundle.id) errors.push("bundle.id is required");
        if (!config.bundle.title_ar) errors.push("bundle.title_ar is required");
        if (typeof config.bundle.price !== 'number' || config.bundle.price <= 0) {
            errors.push("bundle.price must be a positive number");
        }
        if (!Array.isArray(config.bundle.components) || config.bundle.components.length !== 5) {
            errors.push("bundle.components must contain exactly 5 product items");
        }
    }

    // Anti-fraud
    if (!config.anti_fraud || typeof config.anti_fraud !== 'object') {
        errors.push("Missing 'anti_fraud' configuration");
    } else {
        if (!config.anti_fraud.phone_regex) errors.push("anti_fraud.phone_regex is required");
    }

    if (errors.length > 0) {
        throw new Error(`Store configuration validation failed:\n - ${errors.join('\n - ')}`);
    }

    return config;
}

module.exports = {
    validateStoreConfig
};
