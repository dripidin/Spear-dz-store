'use strict';

const { createServer } = require('../dev-server');

/**
 * Creates and starts an isolated HTTP server fixture on an ephemeral port (port 0).
 * Safely tracks client connections and ensures clean teardown even if tests throw.
 *
 * @returns {Promise<{
 *   server: import('http').Server,
 *   port: number,
 *   baseUrl: string,
 *   fetch: (path: string, options?: RequestInit) => Promise<Response>,
 *   close: () => Promise<void>
 * }>}
 */
function createManagedTestServer() {
    return new Promise((resolve, reject) => {
        let server;
        try {
            server = createServer();
        } catch (err) {
            return reject(err);
        }

        const openSockets = new Set();
        server.on('connection', (socket) => {
            openSockets.add(socket);
            socket.on('close', () => openSockets.delete(socket));
        });

        server.on('error', (err) => {
            reject(err);
        });

        // Listen on an OS-assigned ephemeral port on loopback interface
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            const port = addr.port;
            const baseUrl = `http://127.0.0.1:${port}`;

            const close = () => {
                return new Promise((resolveClose) => {
                    for (const socket of openSockets) {
                        try { socket.destroy(); } catch (_) {}
                    }
                    openSockets.clear();
                    server.close(() => {
                        resolveClose();
                    });
                });
            };

            const testFetch = (resourcePath, options = {}) => {
                const targetUrl = resourcePath.startsWith('http')
                    ? resourcePath
                    : `${baseUrl}${resourcePath.startsWith('/') ? '' : '/'}${resourcePath}`;
                return fetch(targetUrl, options);
            };

            resolve({
                server,
                port,
                baseUrl,
                fetch: testFetch,
                close
            });
        });
    });
}

module.exports = {
    createManagedTestServer
};
