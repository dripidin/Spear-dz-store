# SPEAR-DZ — Vercel Web Analytics API Technical Report

**Project Root**: `D:/Websites On Line/Spear-dz`  
**Endpoint**: `GET /api/admin/website-analytics`  
**Client Module**: `lib/vercelAnalytics.js`  

---

## 1. Executive Summary

This report documents the implementation and contract of the Vercel Web Analytics backend integration in SPEAR-DZ. The implementation provides:
1. A resilient client module (`lib/vercelAnalytics.js`) that never throws errors during module import.
2. A protected serverless endpoint (`api/admin/website-analytics.js`) requiring admin session authorization.
3. Strict fail-safe behavior: returns HTTP 503 `ANALYTICS_NOT_CONFIGURED` when environment variables are missing, allowing the serverless handler to boot cleanly.
4. Total protection against secret leakage: tokens, authorization headers, and raw upstream error bodies are never returned to client responses or emitted into production logs.

---

## 2. API Endpoint Specification

### `GET /api/admin/website-analytics`

#### Request Headers
| Header | Required | Value / Format |
|---|---|---|
| `Authorization` | Yes | `Bearer <ADMIN_API_TOKEN_OR_SESSION>` |
| `Accept` | No | `application/json` |

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `metric` | string | No | `visits` | Target metric family: `'visits'` or `'events'` |
| `since` | string (ISO-8601) | No | 7 days ago | Window start timestamp |
| `until` | string (ISO-8601) | No | Current timestamp | Window end timestamp |
| `by` | string | No | null (count mode) | Grouping dimension |
| `limit` | integer | No | 20 (max 50) | Bounded item count for aggregate queries |

#### Allowed Dimensions
- **Visits (`metric=visits`)**:
  - `day`: Daily time series counts
  - `route`: Page routes (e.g., `/`, `/checkout`)
  - `country`: Two-letter country codes (e.g., `DZ`)
  - `referrerHostname`: Referring domains (e.g., `facebook.com`, `instagram.com`)
  - `deviceType`: Device categorizations (`mobile`, `desktop`, `tablet`)
  - `browserName`: Browser categorizations (`Chrome`, `Safari`, `Firefox`)
- **Events (`metric=events`)**:
  - `day`: Daily event series
  - `eventName`: Custom event identifiers

#### Response Headers
| Header | Value | Purpose |
|---|---|---|
| `Content-Type` | `application/json` | Standard JSON payload |
| `Cache-Control` | `private, no-store` | Enforces private cache; prevents CDN cache bleeding |

---

## 3. Response Schemas & Status Codes

### Success Response (HTTP 200)
```json
{
  "success": true,
  "metric": "visits",
  "since": "2026-10-07T00:00:00.000Z",
  "until": "2026-10-14T00:00:00.000Z",
  "by": "day",
  "data": [
    { "key": "2026-10-07", "value": 185 },
    { "key": "2026-10-08", "value": 240 }
  ]
}
```

### Unconfigured Environment Response (HTTP 503)
```json
{
  "success": false,
  "error": "ANALYTICS_NOT_CONFIGURED",
  "message": "Vercel Web Analytics API credentials are not configured on this server"
}
```

### Authentication Failure (HTTP 401)
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Valid admin credentials or active session required"
}
```

### Method Not Allowed (HTTP 405)
```json
{
  "success": false,
  "error": "METHOD_NOT_ALLOWED",
  "message": "Only GET requests are supported for this endpoint"
}
```

### Invalid Parameters (HTTP 400)
```json
{
  "success": false,
  "error": "INVALID_PARAMETER",
  "message": "Invalid dimension 'invalid_dim' for metric 'visits'. Allowed: day, route, country, referrerHostname, deviceType, browserName"
}
```

### Upstream Service Errors (HTTP 502 / 504)
```json
{
  "success": false,
  "error": "UPSTREAM_AUTH_ERROR",
  "message": "Upstream analytics credentials rejected or unauthorized"
}
```

---

## 4. Verification & Status Table

| Capability | Scope | Status | Notes |
|---|---|---|---|
| Module Resilience | `lib/vercelAnalytics.js` | **PASS** | Evaluated via unit tests with unset `VERCEL_TOKEN` |
| Method Enforcement | `api/admin/website-analytics.js` | **PASS** | Returns 405 for POST, PUT, DELETE; 200 for OPTIONS |
| Admin Authentication | `api/admin/website-analytics.js` | **PASS** | Validates against `authenticateAdmin(req)` with 401 reject |
| Parameter Validation | Date bounds & dimensions | **PASS** | Enforces max 31-day window, `since <= until`, valid dimensions |
| Cache Policy | `Cache-Control` | **PASS** | Enforces `private, no-store` across all responses |
| Secret Sanitization | Logs & Client Output | **PASS** | Zero token/body leakage verified via mock testing |
| Local Unit & API Tests | `tests/websiteAnalytics.test.js` | **PASS** | 24 dedicated test cases passing in Node.js test runner |
| Production API Access | Vercel Live API | **BLOCKED** | Pending owner injection of `VERCEL_TOKEN` in project settings |
| Custom Events Endpoint | `/v1/query/web-analytics/events/*` | **NOT TESTED** | Requires Vercel Pro/Enterprise plan confirmation |
