'use strict';

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// 1. Verify module load without throwing when env vars are missing
const savedEnv = { ...process.env };
delete process.env.VERCEL_TOKEN;

const vercelAnalytics = require('../lib/vercelAnalytics');
const websiteAnalyticsHandler = require('../api/admin/website-analytics');

// Helper to simulate request / response for serverless handler
function mockReqRes(method, query = {}, headers = {}) {
    let statusCode = 200;
    let resHeaders = {};
    let responseBody = '';

    const req = {
        method,
        query,
        headers: { 'host': 'localhost:3000', ...headers },
        url: '/api/admin/website-analytics'
    };

    const res = {
        writeHead: (code, hdrs) => {
            statusCode = code;
            if (hdrs) {
                for (const [k, v] of Object.entries(hdrs)) {
                    resHeaders[k.toLowerCase()] = v;
                }
            }
        },
        setHeader: (k, v) => {
            resHeaders[k.toLowerCase()] = v;
        },
        end: (data) => {
            if (data) responseBody = data;
        },
        status: function (code) {
            statusCode = code;
            return this;
        },
        json: function (payload) {
            responseBody = JSON.stringify(payload);
            return this;
        }
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getHeaders: () => resHeaders,
        getBody: () => responseBody,
        getJson: () => {
            try { return JSON.parse(responseBody); } catch (_) { return null; }
        }
    };
}

describe('Vercel Web Analytics — Server-Side Client & API Endpoint Tests', () => {

    beforeEach(() => {
        process.env.ADMIN_API_TOKEN = 'test-admin-secret-token-12345';
        delete process.env.VERCEL_TOKEN;
        process.env.VERCEL_PROJECT_ID = 'prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9';
        process.env.VERCEL_TEAM_ID = 'team_QTvZdIUT8BJL4CV3eQYCoZwR';
    });

    afterEach(() => {
        for (const key of Object.keys(process.env)) {
            if (!(key in savedEnv)) delete process.env[key];
        }
        Object.assign(process.env, savedEnv);
    });

    // ── Group A: Module Loading & Configuration Guards ────────────────────────
    describe('A. Configuration & Resilience', () => {
        test('Module loads successfully without throwing when VERCEL_TOKEN is unset', () => {
            assert.ok(vercelAnalytics, 'lib/vercelAnalytics should export functions');
            assert.strictEqual(typeof vercelAnalytics.isAnalyticsConfigured, 'function');
        });

        test('isAnalyticsConfigured returns false when VERCEL_TOKEN is missing', () => {
            delete process.env.VERCEL_TOKEN;
            assert.strictEqual(vercelAnalytics.isAnalyticsConfigured(), false);
        });

        test('isAnalyticsConfigured returns true when credentials and project IDs are set', () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_abc123';
            process.env.VERCEL_PROJECT_ID = 'prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9';
            process.env.VERCEL_TEAM_ID = 'team_QTvZdIUT8BJL4CV3eQYCoZwR';
            assert.strictEqual(vercelAnalytics.isAnalyticsConfigured(), true);
        });

        test('Executing query without VERCEL_TOKEN throws ANALYTICS_NOT_CONFIGURED with status 503', async () => {
            delete process.env.VERCEL_TOKEN;
            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    });
                },
                (err) => {
                    assert.strictEqual(err.code, 'ANALYTICS_NOT_CONFIGURED');
                    assert.strictEqual(err.status, 503);
                    return true;
                }
            );
        });
    });

    // ── Group B: Date & Dimension Parameter Validation ────────────────────────
    describe('B. Parameter Validations', () => {
        test('Validates date range: rejects missing since or until', () => {
            assert.throws(() => {
                vercelAnalytics.validateDateRange(null, '2026-10-07T00:00:00.000Z');
            }, /Both 'since' and 'until' parameters are required/);
        });

        test('Validates date range: rejects malformed dates', () => {
            assert.throws(() => {
                vercelAnalytics.validateDateRange('invalid-date', '2026-10-07T00:00:00.000Z');
            }, /Invalid date format/);
        });

        test('Validates date range: rejects since later than until', () => {
            assert.throws(() => {
                vercelAnalytics.validateDateRange('2026-10-10T00:00:00.000Z', '2026-10-05T00:00:00.000Z');
            }, /must not be later than/);
        });

        test('Validates date range: rejects windows exceeding 31 days', () => {
            assert.throws(() => {
                vercelAnalytics.validateDateRange('2026-08-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');
            }, /exceeds maximum allowed window of 30 days/);
        });

        test('Validates visits dimensions against documented set', async () => {
            process.env.VERCEL_TOKEN = 'test-token';
            const valid = ['day', 'route', 'country', 'referrerHostname', 'deviceType', 'browserName'];
            for (const dim of valid) {
                assert.ok(vercelAnalytics.VALID_VISITS_DIMENSIONS.has(dim), `Dimension ${dim} should be valid`);
            }

            // Reject invalid dimension
            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsAggregate({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z',
                        by: 'unsupported_dimension'
                    });
                },
                /Invalid visits aggregation dimension/
            );
        });

        test('Validates custom events dimensions against documented set', async () => {
            process.env.VERCEL_TOKEN = 'test-token';
            assert.ok(vercelAnalytics.VALID_EVENTS_DIMENSIONS.has('day'));
            assert.ok(vercelAnalytics.VALID_EVENTS_DIMENSIONS.has('eventName'));

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchEventsAggregate({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z',
                        by: 'unsupported_events_dimension'
                    });
                },
                /Invalid events aggregation dimension/
            );
        });
    });

    // ── Group C: Upstream Mock Fetch & Security ───────────────────────────────
    describe('C. Request Formation & Secret Leak Prevention', () => {
        test('Constructs accurate Vercel Web Analytics API request with Bearer token and canonical IDs', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_xyz';
            process.env.VERCEL_PROJECT_ID = 'prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9';
            process.env.VERCEL_TEAM_ID = 'team_QTvZdIUT8BJL4CV3eQYCoZwR';

            let capturedUrl = null;
            let capturedHeaders = null;

            const mockFetch = async (url, opts) => {
                capturedUrl = url;
                capturedHeaders = opts.headers;
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ value: 1420 })
                };
            };

            const result = await vercelAnalytics.fetchVisitsCount({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z'
            }, { fetch: mockFetch });

            assert.strictEqual(result.value, 1420);
            assert.ok(capturedUrl.includes('https://api.vercel.com/v1/query/web-analytics/visits/count'));
            assert.ok(capturedUrl.includes('projectId=prj_4B3Vl8jibrc15mzdw0fZtHiPfgY9'));
            assert.ok(capturedUrl.includes('teamId=team_QTvZdIUT8BJL4CV3eQYCoZwR'));
            assert.strictEqual(capturedHeaders['Authorization'], 'Bearer vck_secret_token_xyz');
        });

        test('Upstream 401/403 credentials error maps to 502 UPSTREAM_AUTH_ERROR (never client 401)', async () => {
            process.env.VERCEL_TOKEN = 'bad_token';

            const mockFetch = async () => ({
                ok: false,
                status: 403,
                text: async () => '{"error":{"message":"Forbidden: invalid token"}}'
            });

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    }, { fetch: mockFetch });
                },
                (err) => {
                    assert.strictEqual(err.status, 502);
                    assert.strictEqual(err.code, 'UPSTREAM_AUTH_ERROR');
                    // Verify that raw upstream token or body is not attached to the message
                    assert.ok(!err.message.includes('bad_token'));
                    return true;
                }
            );
        });

        test('Upstream 429 rate limit maps to 429 RATE_LIMITED', async () => {
            process.env.VERCEL_TOKEN = 'test-token';

            const mockFetch = async () => ({
                ok: false,
                status: 429,
                text: async () => 'Rate limit exceeded'
            });

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    }, { fetch: mockFetch });
                },
                (err) => {
                    assert.strictEqual(err.status, 429);
                    assert.strictEqual(err.code, 'RATE_LIMITED');
                    return true;
                }
            );
        });

        test('Upstream timeout maps to 504 UPSTREAM_TIMEOUT', async () => {
            process.env.VERCEL_TOKEN = 'test-token';

            const mockFetch = async () => {
                const timeoutErr = new Error('The operation was aborted');
                timeoutErr.name = 'TimeoutError';
                throw timeoutErr;
            };

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    }, { fetch: mockFetch });
                },
                (err) => {
                    assert.strictEqual(err.status, 504);
                    assert.strictEqual(err.code, 'UPSTREAM_TIMEOUT');
                    return true;
                }
            );
        });

        test('Parses documented visits/count response shape with pageviews and visitors objects', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_123';

            const documentedCountFixture = {
                pageviews: { value: 5240 },
                visitors: { value: 1820 }
            };

            const mockFetch = async () => ({
                ok: true,
                status: 200,
                json: async () => documentedCountFixture
            });

            const result = await vercelAnalytics.fetchVisitsCount({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z'
            }, { fetch: mockFetch });

            assert.strictEqual(result.pageviews.value, 5240);
            assert.strictEqual(result.visitors.value, 1820);
        });

        test('Parses documented visits/aggregate response shape with key, pageviews, and visitors', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_123';

            const documentedAggregateFixture = [
                { key: 'facebook.com', pageviews: 3200, visitors: 1100, value: 3200 },
                { key: 'google.com', pageviews: 1500, visitors: 550, value: 1500 }
            ];

            const mockFetch = async () => ({
                ok: true,
                status: 200,
                json: async () => documentedAggregateFixture
            });

            const result = await vercelAnalytics.fetchVisitsAggregate({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z',
                by: 'referrerHostname',
                limit: 5
            }, { fetch: mockFetch });

            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].key, 'facebook.com');
            assert.strictEqual(result[0].pageviews, 3200);
            assert.strictEqual(result[0].visitors, 1100);
        });

        test('Parses documented events/count and events/aggregate response shapes', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_123';

            const documentedEventsCount = { events: { value: 350 } };
            const documentedEventsAggregate = [
                { key: 'OrderSubmitted', events: 45, value: 45 },
                { key: 'OrderFormStarted', events: 120, value: 120 }
            ];

            const countResult = await vercelAnalytics.fetchEventsCount({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z'
            }, { fetch: async () => ({ ok: true, status: 200, json: async () => documentedEventsCount }) });

            assert.strictEqual(countResult.events.value, 350);

            const aggResult = await vercelAnalytics.fetchEventsAggregate({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z',
                by: 'eventName'
            }, { fetch: async () => ({ ok: true, status: 200, json: async () => documentedEventsAggregate }) });

            assert.ok(Array.isArray(aggResult));
            assert.strictEqual(aggResult.length, 2);
            assert.strictEqual(aggResult[0].key, 'OrderSubmitted');
        });

        test('Handles empty analytics count and aggregate results gracefully', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_123';

            const emptyCount = { pageviews: { value: 0 }, visitors: { value: 0 } };
            const emptyAgg = [];

            const countRes = await vercelAnalytics.fetchVisitsCount({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z'
            }, { fetch: async () => ({ ok: true, status: 200, json: async () => emptyCount }) });
            assert.strictEqual(countRes.pageviews.value, 0);

            const aggRes = await vercelAnalytics.fetchVisitsAggregate({
                since: '2026-10-01T00:00:00.000Z',
                until: '2026-10-07T00:00:00.000Z',
                by: 'country'
            }, { fetch: async () => ({ ok: true, status: 200, json: async () => emptyAgg }) });
            assert.ok(Array.isArray(aggRes));
            assert.strictEqual(aggRes.length, 0);
        });

        test('Upstream malformed non-JSON response throws UPSTREAM_MALFORMED_RESPONSE with 502', async () => {
            process.env.VERCEL_TOKEN = 'vck_secret_token_123';

            const mockFetch = async () => ({
                ok: true,
                status: 200,
                json: async () => { throw new Error('Unexpected token < in JSON at position 0'); }
            });

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    }, { fetch: mockFetch });
                },
                (err) => {
                    assert.strictEqual(err.status, 502);
                    assert.strictEqual(err.code, 'UPSTREAM_MALFORMED_RESPONSE');
                    return true;
                }
            );
        });

        test('Zero secret leakage: upstream error never exposes VERCEL_TOKEN or upstream body', async () => {
            const secretToken = 'vck_ultra_confidential_secret_998877';
            process.env.VERCEL_TOKEN = secretToken;

            const upstreamSensitiveError = '{"error":"Secret database connection leak"}';

            const mockFetch = async () => ({
                ok: false,
                status: 500,
                text: async () => upstreamSensitiveError
            });

            await assert.rejects(
                async () => {
                    await vercelAnalytics.fetchVisitsCount({
                        since: '2026-10-01T00:00:00.000Z',
                        until: '2026-10-07T00:00:00.000Z'
                    }, { fetch: mockFetch });
                },
                (err) => {
                    assert.strictEqual(err.status, 502);
                    assert.strictEqual(err.code, 'UPSTREAM_SERVICE_UNAVAILABLE');
                    assert.ok(!err.message.includes(secretToken), 'Must not leak secret token');
                    assert.ok(!err.message.includes('Secret database connection leak'), 'Must not leak upstream body');
                    return true;
                }
            );
        });
    });

    // ── Group D: Serverless Endpoint Security & Route Contract ────────────────
    describe('D. Protected Endpoint: api/admin/website-analytics.js', () => {
        test('Blocks non-GET requests with 405 Method Not Allowed', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('POST');
            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 405);
            const body = getJson();
            assert.strictEqual(body.error, 'METHOD_NOT_ALLOWED');
        });

        test('Handles OPTIONS preflight with 200, empty body, restrictive CORS, and Cache-Control: private, no-store', async () => {
            const { req, res, getStatus, getBody, getHeaders } = mockReqRes('OPTIONS', {}, {
                'origin': 'https://speardz.vercel.app'
            });
            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 200);
            assert.strictEqual(getBody(), '', 'OPTIONS must return no body or analytics data');
            assert.strictEqual(getHeaders()['cache-control'], 'private, no-store');
            assert.notStrictEqual(getHeaders()['access-control-allow-origin'], '*', 'Must never use wildcard CORS origin');
            assert.strictEqual(getHeaders()['access-control-allow-credentials'], 'true');
        });

        test('Rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
            const { req, res, getStatus, getJson, getHeaders } = mockReqRes('GET', {}, {});
            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 401);
            const body = getJson();
            assert.strictEqual(body.error, 'UNAUTHORIZED');
            assert.strictEqual(getHeaders()['cache-control'], 'private, no-store');
        });

        test('Rejects invalid admin token with 401 UNAUTHORIZED', async () => {
            const { req, res, getStatus } = mockReqRes('GET', {}, {
                'authorization': 'Bearer wrong-admin-token'
            });
            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 401);
        });

        test('Authenticated request returns 503 ANALYTICS_NOT_CONFIGURED when VERCEL_TOKEN is unset', async () => {
            delete process.env.VERCEL_TOKEN;

            const { req, res, getStatus, getJson, getHeaders } = mockReqRes('GET', {}, {
                'authorization': 'Bearer test-admin-secret-token-12345'
            });

            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 503);
            const body = getJson();
            assert.strictEqual(body.error, 'ANALYTICS_NOT_CONFIGURED');
            assert.strictEqual(getHeaders()['cache-control'], 'private, no-store');
        });

        test('Authenticated request enforces Cache-Control: private, no-store', async () => {
            delete process.env.VERCEL_TOKEN;

            const { req, res, getHeaders } = mockReqRes('GET', {}, {
                'authorization': 'Bearer test-admin-secret-token-12345'
            });

            await websiteAnalyticsHandler(req, res);
            const headers = getHeaders();
            assert.strictEqual(headers['cache-control'], 'private, no-store');
        });

        test('Authenticated request rejects unsupported metric with 400', async () => {
            process.env.VERCEL_TOKEN = 'test-vercel-token';

            const { req, res, getStatus, getJson } = mockReqRes('GET', {
                metric: 'unsupported_metric'
            }, {
                'authorization': 'Bearer test-admin-secret-token-12345'
            });

            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 400);
            const body = getJson();
            assert.strictEqual(body.error, 'INVALID_PARAMETER');
        });

        test('Authenticated request rejects invalid dimension with 400', async () => {
            process.env.VERCEL_TOKEN = 'test-vercel-token';

            const { req, res, getStatus, getJson } = mockReqRes('GET', {
                metric: 'visits',
                by: 'illegal_dimension'
            }, {
                'authorization': 'Bearer test-admin-secret-token-12345'
            });

            await websiteAnalyticsHandler(req, res);
            assert.strictEqual(getStatus(), 400);
            const body = getJson();
            assert.strictEqual(body.error, 'INVALID_PARAMETER');
        });
    });

    // ── Group E: Client Integration & Build Verification ──────────────────────
    describe('E. Storefront Client Mounting & Build Output', () => {
        test('src/main.jsx imports and mounts exactly one <Analytics /> component', () => {
            const mainContent = fs.readFileSync(path.join(__dirname, '../src/main.jsx'), 'utf-8');
            assert.ok(mainContent.includes("import { Analytics } from '@vercel/analytics/react'"), 'Must import Analytics from @vercel/analytics/react');
            const matches = mainContent.match(/<Analytics\s*\/>/g);
            assert.ok(matches && matches.length === 1, 'Must contain exactly one <Analytics /> component');
        });

        test('src/main.jsx imports and mounts exactly one <SpeedInsights /> component', () => {
            const mainContent = fs.readFileSync(path.join(__dirname, '../src/main.jsx'), 'utf-8');
            assert.ok(mainContent.includes("import { SpeedInsights } from '@vercel/speed-insights/react'"), 'Must import SpeedInsights from @vercel/speed-insights/react');
            const matches = mainContent.match(/<SpeedInsights\s*\/>/g);
            assert.ok(matches && matches.length === 1, 'Must contain exactly one <SpeedInsights /> component');
        });

        test('admin.html does NOT contain storefront Analytics tracking component', () => {
            const adminContent = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf-8');
            assert.ok(!adminContent.includes('@vercel/analytics'), 'admin.html must not include the storefront tracking package');
            assert.ok(!adminContent.includes('@vercel/speed-insights'), 'admin.html must not include speed-insights package');
        });
    });
});
