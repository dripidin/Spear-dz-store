'use strict';

const crypto = require('crypto');
const { timingSafeCompare, applyCorsHeaders } = require('../../lib/security');
const { getStorage } = require('../../lib/storage');

// In-memory active session tokens cache (backed by expiration timestamp)
const activeSessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 Hours

/**
 * Validates whether a token string is a valid active admin session.
 */
function isValidAdminSession(token) {
    if (!token) return false;
    const session = activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return false;
    }
    return true;
}

/**
 * Creates a new secure session token.
 */
function createAdminSession(identity = 'admin') {
    const sessionToken = 'spdz_sess_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    activeSessions.set(sessionToken, {
        identity,
        createdAt: Date.now(),
        expiresAt
    });
    return { sessionToken, expiresAt };
}

/**
 * Revokes an existing session token.
 */
function revokeAdminSession(token) {
    if (!token) return;
    activeSessions.delete(token);
}

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const configuredToken = (process.env.ADMIN_API_TOKEN || '').trim();

    try {
        // ── GET: Check session validity ──────────────────────────────────────
        if (req.method === 'GET') {
            const authHeader = req.headers['authorization'] || req.headers['x-admin-session'] || '';
            let token = '';
            if (authHeader.toLowerCase().startsWith('bearer ')) {
                token = authHeader.slice(7).trim();
            } else {
                token = authHeader.trim();
            }

            // Check session map or direct master token
            const valid = isValidAdminSession(token) || (configuredToken && timingSafeCompare(token, configuredToken));

            if (!valid) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, authenticated: false, error: 'Session invalid or expired' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                authenticated: true,
                user: { name: 'Directeur Général SPEAR-DZ', role: 'superadmin' }
            }));
            return;
        }

        // ── POST: Authenticate and issue session token ───────────────────────
        if (req.method === 'POST') {
            const body = req.body || {};
            const inputToken = (body.token || body.password || body.apiKey || '').trim();

            if (!configuredToken) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'ADMIN_API_TOKEN is not configured on server'
                }));
                return;
            }

            if (!inputToken || !timingSafeCompare(inputToken, configuredToken)) {
                // Rate-limit deterrence delay
                await new Promise(r => setTimeout(r, 400));
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Identifiants ou code administrateur invalide'
                }));
                return;
            }

            // Create verified session
            const { sessionToken, expiresAt } = createAdminSession('admin');

            try {
                const storage = getStorage();
                await storage.recordAuditLog('ADMIN_LOGIN', 'session', sessionToken.slice(0, 16), 'admin', {
                    expiresAt: new Date(expiresAt).toISOString()
                });
            } catch (_) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                authenticated: true,
                sessionToken,
                expiresAt: new Date(expiresAt).toISOString(),
                user: { name: 'Directeur Général SPEAR-DZ', role: 'superadmin' }
            }));
            return;
        }

        // ── DELETE: Logout and invalidate session ────────────────────────────
        if (req.method === 'DELETE') {
            const authHeader = req.headers['authorization'] || '';
            const token = authHeader.replace(/^Bearer /i, '').trim();
            revokeAdminSession(token);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Session révoquée avec succès' }));
            return;
        }

        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));

    } catch (err) {
        console.error('[api/admin/auth] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
    }
};

module.exports.isValidAdminSession = isValidAdminSession;
