'use strict';

/**
 * =============================================================================
 * SPEAR-DZ — Admin Authentication API Gateway (/api/auth)
 * Validates credentials against Vercel Environment Variables:
 * ADMIN_API_TOKEN or ADMIN_PASSWORD (with default fallback)
 * =============================================================================
 */

const { timingSafeCompare, applyCorsHeaders } = require('../lib/security');

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED' }));
        return;
    }

    try {
        const body = req.body || {};
        const inputPassword = (body.password || body.token || body.apiKey || '').toString().trim();

        const configuredToken = (process.env.ADMIN_API_TOKEN || process.env.ADMIN_PASSWORD || 'L3abedstore2026').toString().trim();

        if (!inputPassword) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'MISSING_PASSWORD' }));
            return;
        }

        if (timingSafeCompare(inputPassword, configuredToken) || inputPassword === configuredToken) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'AUTHENTICATED',
                token: configuredToken,
                sessionToken: configuredToken,
                user: { name: 'Directeur Général SPEAR-DZ', role: 'superadmin' }
            }));
        } else {
            // Anti-bruteforce delay
            await new Promise(r => setTimeout(r, 400));
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'INVALID_PASSWORD'
            }));
        }
    } catch (err) {
        console.error('[api/auth Error]:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'INTERNAL_ERROR' }));
    }
};
