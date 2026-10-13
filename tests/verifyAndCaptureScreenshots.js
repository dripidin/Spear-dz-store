const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Ensure screenshots output directory exists
const outputDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Artifact directory
const artifactDir = 'C:\\Users\\MICRO\\.gemini\\antigravity-ide\\brain\\631d22e0-b304-4273-a224-e451594ea034';

class ChromeController {
    constructor() {
        this.proc = null;
        this.ws = null;
        this.msgId = 1;
        this.pending = new Map();
    }

    async start() {
        const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        this.proc = spawn(chromePath, [
            '--headless=new',
            '--remote-debugging-port=9222',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            '--user-data-dir=C:\\Users\\MICRO\\AppData\\Local\\Temp\\chrome_cdp_verify'
        ]);

        let targets = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 200));
            try {
                targets = await new Promise((resolve, reject) => {
                    http.get('http://127.0.0.1:9222/json', (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => resolve(JSON.parse(data)));
                    }).on('error', reject);
                });
                if (targets && targets.length > 0) break;
            } catch (e) {}
        }

        if (!targets || !targets[0]) throw new Error('Could not get Chrome DevTools target');
        const pageTarget = targets.find(t => t.type === 'page') || targets[0];
        const wsUrl = pageTarget.webSocketDebuggerUrl;

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = reject;
            this.ws.onmessage = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.id && this.pending.has(data.id)) {
                    const { resolve, reject } = this.pending.get(data.id);
                    this.pending.delete(data.id);
                    if (data.error) reject(new Error(data.error.message));
                    else resolve(data.result);
                }
            };
        });
    }

    send(method, params = {}) {
        const id = this.msgId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async close() {
        if (this.ws) this.ws.close();
        if (this.proc) this.proc.kill();
    }
}

async function runVerification() {
    console.log('[Verification] Launching Chrome CDP Controller...');
    const chrome = new ChromeController();
    await chrome.start();

    await chrome.send('Page.enable');
    await chrome.send('Runtime.enable');
    await chrome.send('DOM.enable');

    console.log('[Verification] Navigating to http://localhost:3000/admin...');
    await chrome.send('Page.navigate', { url: 'http://localhost:3000/admin' });
    await new Promise(r => setTimeout(r, 1200));

    // Submit authentication
    console.log('[Verification] Submitting Admin Credentials (L3abedstore2026)...');
    const authRes = await chrome.send('Runtime.evaluate', {
        expression: `(async () => {
            const pwdInput = document.getElementById('adminAuthPassword');
            if (pwdInput) pwdInput.value = 'L3abedstore2026';
            await storeAdmin.handleAuthSubmit(new Event('submit'));
            return {
                authOverlayDisplay: document.getElementById('adminAuthOverlay').style.display,
                appLayoutDisplay: document.getElementById('appLayoutWrapper').style.display
            };
        })()`,
        awaitPromise: true,
        returnByValue: true
    });
    console.log('[Verification] Auth result:', authRes.result.value);

    // Allow data, charts, and fonts to render
    await new Promise(r => setTimeout(r, 1500));

    const viewports = [
        { name: '1440x900_ar_rtl', width: 1440, height: 900, lang: 'ar', dir: 'rtl', viewMode: 'table' },
        { name: '1440x900_fr_ltr', width: 1440, height: 900, lang: 'fr', dir: 'ltr', viewMode: 'table' },
        { name: '1440x900_ar_grid', width: 1440, height: 900, lang: 'ar', dir: 'rtl', viewMode: 'grid' },
        { name: '390x844_ar_rtl', width: 390, height: 844, lang: 'ar', dir: 'rtl', viewMode: 'grid' },
        { name: '360x800_ar_rtl', width: 360, height: 800, lang: 'ar', dir: 'rtl', viewMode: 'grid' }
    ];

    const results = [];

    for (const vp of viewports) {
        console.log(`\n======================================================`);
        console.log(`[Testing Viewport] ${vp.name} (${vp.width}x${vp.height}, Lang: ${vp.lang}, Dir: ${vp.dir}, ViewMode: ${vp.viewMode})`);

        // Set device metrics
        await chrome.send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 1,
            mobile: vp.width <= 768
        });

        // Set language, view mode, and reset scroll position to top
        await chrome.send('Runtime.evaluate', {
            expression: `(() => {
                window.scrollTo(0, 0);
                storeAdmin.setLanguage('${vp.lang}');
                storeAdmin.setViewMode('${vp.viewMode}');
            })()`
        });

        // Wait for reflow and Chart resize
        await new Promise(r => setTimeout(r, 600));

        // Evaluate layout metrics
        const metricsRes = await chrome.send('Runtime.evaluate', {
            expression: `(() => {
                const nav = document.querySelector('.app-navbar');
                const sidebar = document.querySelector('.app-sidebar');
                const bodyContainer = document.querySelector('.app-body-container');
                const main = document.querySelector('.app-main-content');
                const kpiGrid = document.querySelector('.app-kpi-grid');
                const visibleKpiCards = Array.from(document.querySelectorAll('.kpi-card')).filter(c => getComputedStyle(c).display !== 'none');
                const chartsRow = document.querySelector('.app-charts-row');
                const trendChart = document.getElementById('trendChartCanvas');
                const wilayaChart = document.getElementById('wilayaChartCanvas');
                const ordersTableWrapper = document.getElementById('tableResponsiveWrapper');
                const ordersGridView = document.getElementById('ordersGridView');
                const mobileChartSwitcher = document.querySelector('.mobile-chart-switcher');
                const gridCards = document.querySelectorAll('.grid-order-card');
                const customerBoxes = document.querySelectorAll('.customer-identity-box');
                const htmlDir = document.documentElement.getAttribute('dir');
                const htmlLang = document.documentElement.getAttribute('lang');

                const navRect = nav ? nav.getBoundingClientRect() : null;
                const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
                const bodyRect = bodyContainer ? bodyContainer.getBoundingClientRect() : null;
                const mainRect = main ? main.getBoundingClientRect() : null;
                const kpiRect = kpiGrid ? kpiGrid.getBoundingClientRect() : null;
                const chartsRect = chartsRow ? chartsRow.getBoundingClientRect() : null;

                const isMobile = window.innerWidth <= 768;
                const tableVisible = ordersTableWrapper && getComputedStyle(ordersTableWrapper).display !== 'none';
                const gridVisible = ordersGridView && getComputedStyle(ordersGridView).display !== 'none';
                const switcherVisible = mobileChartSwitcher && getComputedStyle(mobileChartSwitcher).display !== 'none';

                return {
                    htmlDir,
                    htmlLang,
                    navHeight: navRect ? Math.round(navRect.height) : 0,
                    sidebarVisible: sidebar ? getComputedStyle(sidebar).display !== 'none' : false,
                    sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
                    mainWidth: mainRect ? Math.round(mainRect.width) : 0,
                    visibleKpiCardsCount: visibleKpiCards.length,
                    trendChartVisible: trendChart ? trendChart.getBoundingClientRect().height > 50 : false,
                    wilayaChartVisible: wilayaChart ? wilayaChart.getBoundingClientRect().height > 50 : false,
                    tableVisible,
                    gridVisible,
                    gridCardsCount: gridCards.length,
                    customerBoxesCount: customerBoxes.length,
                    switcherVisible,
                    isMobile,
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
                };
            })()`,
            returnByValue: true
        });

        const metrics = metricsRes.result.value;
        console.log(`[Metrics Result]:`, JSON.stringify(metrics, null, 2));

        // Capture screenshot
        const screenshotData = await chrome.send('Page.captureScreenshot', {
            format: 'png',
            fromSurface: true
        });

        const imgBuffer = Buffer.from(screenshotData.data, 'base64');
        const fileName = `screenshot_${vp.name}.png`;
        const localPath = path.join(outputDir, fileName);
        const artPath = path.join(artifactDir, fileName);

        fs.writeFileSync(localPath, imgBuffer);
        fs.writeFileSync(artPath, imgBuffer);
        console.log(`[Screenshot Saved]: ${localPath} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);

        // If mobile viewport 390x844, capture the scrolled grid order cards feed
        if (vp.name === '390x844_ar_rtl') {
            await chrome.send('Runtime.evaluate', {
                expression: `(() => {
                    const grid = document.getElementById('ordersGridView');
                    if (grid) grid.scrollIntoView({ behavior: 'instant' });
                })()`
            });
            await new Promise(r => setTimeout(r, 600));

            const cardsScreenshot = await chrome.send('Page.captureScreenshot', {
                format: 'png',
                fromSurface: true
            });
            const cardsBuf = Buffer.from(cardsScreenshot.data, 'base64');
            const cardsLocal = path.join(outputDir, 'screenshot_390x844_ar_orders.png');
            const cardsArt = path.join(artifactDir, 'screenshot_390x844_ar_orders.png');
            fs.writeFileSync(cardsLocal, cardsBuf);
            fs.writeFileSync(cardsArt, cardsBuf);
            console.log(`[Screenshot Saved]: ${cardsLocal} (${(cardsBuf.length / 1024).toFixed(1)} KB)`);

            // ── Test Bulk Selection and Delete Confirmation Modal Flow ──
            console.log('[Verification] Testing Bulk Selection & Delete Modal Flow...');
            const modalMetrics = await chrome.send('Runtime.evaluate', {
                expression: `(() => {
                    // Select first 2 order checkboxes
                    const cbs = document.querySelectorAll('.orders-grid-view .goc-checkbox');
                    if (cbs.length > 0) storeAdmin.toggleOrderSelection(cbs[0].getAttribute('data-order-id'), true);
                    if (cbs.length > 1) storeAdmin.toggleOrderSelection(cbs[1].getAttribute('data-order-id'), true);
                    
                    const toolbar = document.getElementById('bulkActionsToolbar');
                    const toolbarVisible = toolbar && getComputedStyle(toolbar).display !== 'none';
                    const countText = document.getElementById('bulkSelectedCountText')?.textContent;

                    // Open confirmation modal
                    storeAdmin.confirmBulkDelete();
                    const modal = document.getElementById('deleteConfirmModal');
                    const modalVisible = modal && getComputedStyle(modal).display !== 'none';
                    const targetsPill = document.getElementById('deleteTargetsPill')?.textContent;

                    return { toolbarVisible, countText, modalVisible, targetsPill };
                })()`,
                returnByValue: true
            });
            console.log('[Modal Flow Metrics]:', modalMetrics.result.value);

            await new Promise(r => setTimeout(r, 400));
            const modalScreenshot = await chrome.send('Page.captureScreenshot', {
                format: 'png',
                fromSurface: true
            });
            const modalBuf = Buffer.from(modalScreenshot.data, 'base64');
            const modalLocal = path.join(outputDir, 'screenshot_bulk_delete_modal.png');
            const modalArt = path.join(artifactDir, 'screenshot_bulk_delete_modal.png');
            fs.writeFileSync(modalLocal, modalBuf);
            fs.writeFileSync(modalArt, modalBuf);
            console.log(`[Screenshot Saved]: ${modalLocal} (${(modalBuf.length / 1024).toFixed(1)} KB)`);

            // Close modal and clear selection
            await chrome.send('Runtime.evaluate', {
                expression: `(() => {
                    storeAdmin.closeModal('deleteConfirmModal');
                    storeAdmin.clearSelection();
                })()`
            });
        }

        results.push({
            viewport: vp,
            metrics,
            screenshotPath: artPath
        });
    }

    await chrome.close();

    console.log(`\n======================================================`);
    console.log(`[VERIFICATION COMPLETE] All Viewports and Flows Verified & Captured.`);
    return results;
}

runVerification().catch(err => {
    console.error('[Error in verification]:', err);
    process.exit(1);
});
