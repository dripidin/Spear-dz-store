'use strict';

/**
 * =============================================================================
 * SPEAR-DZ — Vercel Web Analytics Server-Side Client
 * Canonical Project: spear.dz (prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9)
 * Team: dripfree (team_QTvZdIUT8BJL4CV3eQYCoZwR)
 * =============================================================================
 */

const VERCEL_API_BASE = 'https://api.vercel.com/v1/query/web-analytics';

// Documented valid query dimensions
const VALID_VISITS_DIMENSIONS = new Set([
    'day',
    'route',
    'country',
    'referrerHostname',
    'deviceType',
    'browserName'
]);

const VALID_EVENTS_DIMENSIONS = new Set([
    'day',
    'eventName'
]);

const MAX_WINDOW_DAYS = 31;
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Checks whether required Vercel Analytics credentials are fully configured.
 * Does not throw; returns boolean.
 */
function isAnalyticsConfigured() {
    const token = (process.env.VERCEL_TOKEN || '').trim();
    const projectId = (process.env.VERCEL_PROJECT_ID || 'prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9').trim();
    const teamId = (process.env.VERCEL_TEAM_ID || 'team_QTvZdIUT8BJL4CV3eQYCoZwR').trim();
    return Boolean(token && projectId && teamId);
}

/**
 * Validates ISO date strings and ensures the window is <= 30/31 days and since <= until.
 */
function validateDateRange(since, until) {
    if (!since || !until) {
        const err = new Error("Both 'since' and 'until' parameters are required");
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    const sinceDate = new Date(since);
    const untilDate = new Date(until);

    if (Number.isNaN(sinceDate.getTime()) || Number.isNaN(untilDate.getTime())) {
        const err = new Error("Invalid date format. Expected ISO-8601 strings for 'since' and 'until'");
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    if (sinceDate.getTime() > untilDate.getTime()) {
        const err = new Error("'since' date must not be later than 'until' date");
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    const diffMs = untilDate.getTime() - sinceDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_WINDOW_DAYS) {
        const err = new Error(`Requested date range (${Math.ceil(diffDays)} days) exceeds maximum allowed window of 30 days`);
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    return {
        sinceIso: sinceDate.toISOString(),
        untilIso: untilDate.toISOString()
    };
}

/**
 * Low-level execution helper for Vercel Web Analytics queries.
 * Validates configuration at execution time, never at module import time.
 */
async function executeAnalyticsQuery(endpointPath, queryParams = {}, options = {}) {
    const token = (process.env.VERCEL_TOKEN || '').trim();
    const projectId = (process.env.VERCEL_PROJECT_ID || 'prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9').trim();
    const teamId = (process.env.VERCEL_TEAM_ID || 'team_QTvZdIUT8BJL4CV3eQYCoZwR').trim();

    if (!token || !projectId || !teamId) {
        const err = new Error('Vercel Web Analytics is not configured. Missing VERCEL_TOKEN or project configuration.');
        err.code = 'ANALYTICS_NOT_CONFIGURED';
        err.status = 503;
        throw err;
    }

    const url = new URL(`${VERCEL_API_BASE}/${endpointPath}`);
    url.searchParams.set('projectId', projectId);
    url.searchParams.set('teamId', teamId);

    for (const [key, val] of Object.entries(queryParams)) {
        if (val !== undefined && val !== null && val !== '') {
            url.searchParams.set(key, String(val));
        }
    }

    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    const fetchFn = options.fetch || globalThis.fetch;

    let response;
    try {
        response = await fetchFn(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined
        });
    } catch (networkErr) {
        const isTimeout = networkErr.name === 'TimeoutError' || networkErr.name === 'AbortError';
        const err = new Error(isTimeout ? 'Upstream analytics request timed out' : 'Upstream analytics connection failed');
        err.code = isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK_ERROR';
        err.status = isTimeout ? 504 : 502;
        throw err;
    }

    if (!response.ok) {
        // Log sanitized diagnostic information only — NEVER log token or raw body
        console.warn(`[VercelAnalytics] Upstream HTTP ${response.status} for endpoint ${endpointPath}`);
        
        let clientStatus = response.status;
        let clientCode = 'UPSTREAM_ERROR';
        let clientMsg = 'Upstream analytics provider returned an error';

        if (response.status === 401 || response.status === 403) {
            // Do NOT convert into client 401/403 to prevent confusing admin auth with upstream token issue
            clientStatus = 502;
            clientCode = 'UPSTREAM_AUTH_ERROR';
            clientMsg = 'Upstream analytics credentials rejected or unauthorized';
        } else if (response.status === 429) {
            clientStatus = 429;
            clientCode = 'RATE_LIMITED';
            clientMsg = 'Upstream analytics rate limit reached. Please retry later.';
        } else if (response.status >= 500) {
            clientStatus = 502;
            clientCode = 'UPSTREAM_SERVICE_UNAVAILABLE';
            clientMsg = 'Upstream analytics service temporarily unavailable';
        }

        const err = new Error(clientMsg);
        err.code = clientCode;
        err.status = clientStatus;
        throw err;
    }

    let payload;
    try {
        payload = await response.json();
    } catch (_) {
        const err = new Error('Malformed JSON received from upstream analytics');
        err.code = 'UPSTREAM_MALFORMED_RESPONSE';
        err.status = 502;
        throw err;
    }

    return payload;
}

/**
 * 1. GET /v1/query/web-analytics/visits/count
 * Retrieves visit count totals within the specified time window.
 */
async function fetchVisitsCount({ since, until }, options = {}) {
    const { sinceIso, untilIso } = validateDateRange(since, until);
    return executeAnalyticsQuery('visits/count', {
        since: sinceIso,
        until: untilIso
    }, options);
}

/**
 * 2. GET /v1/query/web-analytics/visits/aggregate
 * Aggregates visits by a specific valid dimension (day, route, country, referrerHostname, deviceType, browserName).
 */
async function fetchVisitsAggregate({ since, until, by = 'day', limit = 20 }, options = {}) {
    const { sinceIso, untilIso } = validateDateRange(since, until);

    if (!VALID_VISITS_DIMENSIONS.has(by)) {
        const err = new Error(`Invalid visits aggregation dimension '${by}'. Allowed: ${Array.from(VALID_VISITS_DIMENSIONS).join(', ')}`);
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    const boundedLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));

    return executeAnalyticsQuery('visits/aggregate', {
        since: sinceIso,
        until: untilIso,
        by,
        limit: boundedLimit
    }, options);
}

/**
 * 3. GET /v1/query/web-analytics/events/count
 * Retrieves custom event count totals within the specified time window.
 */
async function fetchEventsCount({ since, until }, options = {}) {
    const { sinceIso, untilIso } = validateDateRange(since, until);
    return executeAnalyticsQuery('events/count', {
        since: sinceIso,
        until: untilIso
    }, options);
}

/**
 * 4. GET /v1/query/web-analytics/events/aggregate
 * Aggregates custom events by a specific dimension (day, eventName).
 */
async function fetchEventsAggregate({ since, until, by = 'day', limit = 20 }, options = {}) {
    const { sinceIso, untilIso } = validateDateRange(since, until);

    if (!VALID_EVENTS_DIMENSIONS.has(by)) {
        const err = new Error(`Invalid events aggregation dimension '${by}'. Allowed: ${Array.from(VALID_EVENTS_DIMENSIONS).join(', ')}`);
        err.code = 'INVALID_PARAMETER';
        err.status = 400;
        throw err;
    }

    const boundedLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));

    return executeAnalyticsQuery('events/aggregate', {
        since: sinceIso,
        until: untilIso,
        by,
        limit: boundedLimit
    }, options);
}

module.exports = {
    isAnalyticsConfigured,
    validateDateRange,
    executeAnalyticsQuery,
    fetchVisitsCount,
    fetchVisitsAggregate,
    fetchEventsCount,
    fetchEventsAggregate,
    VALID_VISITS_DIMENSIONS,
    VALID_EVENTS_DIMENSIONS
};
