'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
    require('dotenv').config({ path: path.join(__dirname, '.env.local') });
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {}

const { validateStoreConfig } = require('./lib/configValidator');
const { getStorage, resolveStorageBackend } = require('./lib/storage');

// Validate store configuration on startup
try {
    const config = validateStoreConfig();
    console.log(`[StoreReady] Loaded configuration for: ${config.store.name_fr} (${config.store.name_ar})`);
    console.log(`[StoreReady] Active Bundle: ${config.bundle.title_fr} — ${config.bundle.price} DZD`);
} catch (configErr) {
    console.error(`[StoreConfigError] ${configErr.message}`);
}

// Log persistent storage backend
const backend = resolveStorageBackend();
console.log(`[StorageBackend] Active Production Storage Provider: ${backend.toUpperCase()}`);

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DIST_DIR = path.join(__dirname, 'dist');
const ROOT_DIR = __dirname;

const routes = {
    '/api/send-order': require('./api/send-order'),
    '/api/orders': require('./api/orders'),
    '/api/delivery': require('./api/delivery'),
    '/api/risk': require('./api/risk'),
    '/api/auth': require('./api/auth'),
    '/api/admin/auth': require('./api/admin/auth'),
    '/api/admin/analytics': require('./api/admin/analytics'),
    '/api/admin/tariffs': require('./api/admin/tariffs'),
    '/api/admin/dispatch': require('./api/admin/dispatch'),
    '/api/admin/website-analytics': require('./api/admin/website-analytics')
};

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.csv': 'text/csv; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.mp4': 'video/mp4'
};

function serveFile(req, res, filePath) {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // HTTP Byte-Range support for streaming MP4 video
    const range = req.headers.range;
    if (range && ext === '.mp4') {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType
        });
        file.pipe(res);
        return;
    }

    res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
}

function appHandler(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
    const pathname = parsedUrl.pathname;

    // Check API routes
    if (routes[pathname]) {
        let bodyRaw = '';
        req.on('data', chunk => bodyRaw += chunk);
        req.on('end', () => {
            const queryObj = {};
            parsedUrl.searchParams.forEach((val, key) => { queryObj[key] = val; });
            req.query = queryObj;
            try {
                req.body = bodyRaw ? JSON.parse(bodyRaw) : {};
            } catch (e) {
                req.body = {};
            }

            // Express/Vercel response shims
            res.status = function (code) {
                this.statusCode = code;
                return this;
            };
            res.json = function (obj) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(obj));
                return this;
            };

            routes[pathname](req, res);
        });
        return;
    }

    // Admin Dashboard Route
    if (pathname === '/admin' || pathname === '/admin.html') {
        serveFile(req, res, path.join(ROOT_DIR, 'admin.html'));
        return;
    }

    // Root / Storefront Landing Page
    if (pathname === '/' || pathname === '/index.html') {
        const distIndex = path.join(DIST_DIR, 'index.html');
        if (fs.existsSync(distIndex)) {
            serveFile(req, res, distIndex);
        } else {
            serveFile(req, res, path.join(ROOT_DIR, 'index.html'));
        }
        return;
    }

    // Pack 2 Landing Page (6,600 DZD Pack)
    if (pathname === '/pack2' || pathname === '/pack-2' || pathname === '/pack2.html') {
        const distPack2 = path.join(DIST_DIR, 'pack2.html');
        if (fs.existsSync(distPack2)) {
            serveFile(req, res, distPack2);
        } else {
            serveFile(req, res, path.join(ROOT_DIR, 'pack2.html'));
        }
        return;
    }

    // Check public directory for media & assets (e.g. /css/..., /js/..., /videos/..., /images/...)
    let publicPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        serveFile(req, res, publicPath);
        return;
    }

    // Check dist directory for built React bundles (e.g. /assets/...)
    let distPath = path.join(DIST_DIR, pathname);
    if (fs.existsSync(distPath) && fs.statSync(distPath).isFile()) {
        serveFile(req, res, distPath);
        return;
    }

    // Check root directory fallback
    let rootPath = path.join(ROOT_DIR, pathname);
    if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
        serveFile(req, res, rootPath);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
}

function createServer() {
    return http.createServer(appHandler);
}

const server = createServer();

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`[ServerStarted] Spear-dz Algerian High-Tech Store running on http://localhost:${PORT}`);
        console.log(`[StoreReady] Admin Portal available at http://localhost:${PORT}/admin`);
        console.log(`[StoreReady] Storage Provider: ${backend.toUpperCase()}`);
    });
}

module.exports = server;
module.exports.createServer = createServer;
module.exports.appHandler = appHandler;
module.exports.serveFile = serveFile;
module.exports.MIME_TYPES = MIME_TYPES;
module.exports.routes = routes;
