'use strict';

/**
 * =============================================================================
 * SPEAR-DZ — Protected Administrative Vercel Web Analytics API
 * Route: GET /api/admin/website-analytics
 * =============================================================================
 */

const { authenticateAdmin, applyCorsHeaders } = require('../../lib/security');
const {
    isAnalyticsConfigured,
    validateDateRange,
    fetchVisitsCount,
    fetchVisitsAggregate,
    fetchEventsCount,
    fetchEventsAggregate,
    VALID_VISITS_DIMENSIONS,
    VALID_EVENTS_DIMENSIONS
} = require('../../lib/vercelAnalytics');

module.exports = async (req, res) => {
    applyCorsHeaders(req, res);

    // Enforce private, non-shared cache headers on all responses from this endpoint
    res.setHeader('Cache-Control', 'private, no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Strictly enforce GET method
    if (req.method !== 'GET') {
        res.writeHead(405, {
            'Content-Type': 'application/json',
            'Allow': 'GET, OPTIONS'
        });
        res.end(JSON.stringify({
            success: false,
            error: 'METHOD_NOT_ALLOWED',
            message: 'Only GET requests are supported for this endpoint'
        }));
        return;
    }

    // Require valid admin authentication
    if (!authenticateAdmin(req)) {
        res.writeHead(401, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
            success: false,
            error: 'UNAUTHORIZED',
            message: 'Valid admin credentials or active session required'
        }));
        return;
    }

    // Check if server environment has Vercel API credentials configured
    if (!isAnalyticsConfigured()) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'ANALYTICS_NOT_CONFIGURED',
            message: 'Vercel Web Analytics API credentials are not configured on this server'
        }));
        return;
    }

    try {
        const query = req.query || Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
        
        // Extract query parameters (never accept client-supplied tokens or project IDs)
        const metric = (query.metric || 'visits').toLowerCase().trim();
        const by = query.by ? String(query.by).trim() : null;
        const limit = query.limit ? parseInt(query.limit, 10) : 20;

        // Default to the last 7 days if date parameters are omitted
        let since = query.since;
        let until = query.until;
        if (!since || !until) {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            // Add 1 day to 'until' so Vercel's UTC date boundary truncation covers today's full traffic
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            since = since || sevenDaysAgo.toISOString();
            until = until || tomorrow.toISOString();
        }

        // Validate date bounds (caps at 30/31 days, since <= until)
        const { sinceIso, untilIso } = validateDateRange(since, until);

        // Validate metric parameter
        if (metric !== 'visits' && metric !== 'events') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'INVALID_PARAMETER',
                message: "Unsupported metric. Allowed metrics: 'visits', 'events'"
            }));
            return;
        }

        // Validate dimension parameter
        if (by) {
            const allowedDimensions = metric === 'visits' ? VALID_VISITS_DIMENSIONS : VALID_EVENTS_DIMENSIONS;
            if (!allowedDimensions.has(by)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'INVALID_PARAMETER',
                    message: `Invalid dimension '${by}' for metric '${metric}'. Allowed: ${Array.from(allowedDimensions).join(', ')}`
                }));
                return;
            }
        }

        let resultData;
        if (metric === 'visits') {
            if (by) {
                resultData = await fetchVisitsAggregate({ since: sinceIso, until: untilIso, by, limit });
            } else {
                resultData = await fetchVisitsCount({ since: sinceIso, until: untilIso });
            }
        } else {
            if (by) {
                resultData = await fetchEventsAggregate({ since: sinceIso, until: untilIso, by, limit });
            } else {
                resultData = await fetchEventsCount({ since: sinceIso, until: untilIso });
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            metric,
            since: sinceIso,
            until: untilIso,
            by: by || null,
            data: resultData
        }));

    } catch (err) {
        // Map typed errors to safe HTTP statuses and non-sensitive error messages
        const statusCode = err.status && Number.isInteger(err.status) ? err.status : 500;
        const errorCode = err.code || 'SERVER_ERROR';

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: errorCode,
            message: err.message || 'An error occurred while processing analytics request'
        }));
    }
};
