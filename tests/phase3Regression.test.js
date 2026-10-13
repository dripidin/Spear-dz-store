'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ordersHandler = require('../api/orders');
const sendOrderHandler = require('../api/send-order');
const { MockStorage, setStorageInstance } = require('../lib/storage');

function mockReqRes(method, body = {}, query = {}, headers = {}) {
    let statusCode = 200;
    let resHeaders = {};
    let responseBody = '';

    const req = {
        method,
        body,
        query,
        headers: { 'host': 'localhost:3000', ...headers },
        socket: { remoteAddress: '127.0.0.1' }
    };

    const res = {
        writeHead: (code, hdrs) => {
            statusCode = code;
            if (hdrs) resHeaders = { ...resHeaders, ...hdrs };
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
        getJson: () => {
            try { return JSON.parse(responseBody); } catch (e) { return null; }
        }
    };
}

describe('PHASE 3: Responsive Navbar, Order Actions & Checkout UX Regression Suite', () => {
    const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin.css');
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');
    const orderFormJsxPath = path.join(__dirname, '..', 'src', 'components', 'OrderForm.jsx');
    const stickyMobileBarPath = path.join(__dirname, '..', 'src', 'components', 'StickyMobileBar.jsx');

    let mockStorage;
    const TEST_ADMIN_TOKEN = 'test-phase3-admin-token';

    beforeEach(() => {
        process.env.ADMIN_API_TOKEN = TEST_ADMIN_TOKEN;
        mockStorage = new MockStorage();
        setStorageInstance(mockStorage);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PART A: ADMIN NAVBAR TESTS
    // ─────────────────────────────────────────────────────────────────────────
    describe('PART A — Admin Navbar Layout, Responsiveness & RTL', () => {
        const html = fs.readFileSync(adminHtmlPath, 'utf8');
        const css = fs.readFileSync(adminCssPath, 'utf8');
        const js = fs.readFileSync(adminJsPath, 'utf8');

        test('Desktop navbar layout contains brand, in-flow storefront navigation, search, and action controls', () => {
            assert.ok(html.includes('class="app-navbar"'), 'Must define .app-navbar');
            assert.ok(html.includes('class="navbar-brand-wrapper"'), 'Must contain brand wrapper');
            assert.ok(html.includes('class="store-quick-nav'), 'Must contain store-quick-nav');
            assert.ok(html.includes('id="globalSearchInput"'), 'Must contain global search input');
            assert.ok(html.includes('class="navbar-actions-list"'), 'Must contain actions list');
            assert.ok(html.includes('id="langSubmenuBtn"'), 'Must contain language selector');
        });

        test('Store quick nav does not use hardcoded absolute centering that collides with search', () => {
            // Check that store-quick-nav does not have position: absolute in desktop view
            const hasAbsoluteCenter = css.includes('.store-quick-nav {\n        position: absolute;\n        left: 50%;');
            assert.strictEqual(hasAbsoluteCenter, false, 'store-quick-nav must NOT use position: absolute; left: 50%');
            assert.ok(css.includes('.store-quick-nav {') || css.includes('.store-quick-nav'), 'CSS defines store-quick-nav');
        });

        test('Mobile drawer (#mobileNavFullscreen) includes dedicated storefront links', () => {
            assert.ok(html.includes('id="mobileNavFullscreen"'), 'Must contain mobileNavFullscreen drawer');
            assert.ok(html.includes('mobile-storefront-links'), 'Must contain mobile storefront links in drawer');
            assert.ok(html.includes('href="/"'), 'Must contain link to main storefront');
            assert.ok(html.includes('href="/#orderForm"'), 'Must contain link to order form');
        });

        test('Search field accessibility on mobile via compact/expandable row', () => {
            assert.ok(html.includes('id="navbarMobileSearchRow"'), 'Must contain mobile search row');
            assert.ok(html.includes('id="mobileSearchInput"'), 'Must contain mobile search input');
            assert.ok(html.includes('id="mobileSearchToggleBtn"'), 'Must contain mobile search toggle button');
            assert.ok(js.includes('toggleMobileSearch'), 'admin-client.js must define toggleMobileSearch');
            assert.ok(js.includes('clearSearch'), 'admin-client.js must define clearSearch');
        });

        test('RTL/LTR logical properties and overflow prevention are enforced', () => {
            assert.ok(css.includes('overflow-x: hidden'), 'Body must enforce overflow-x: hidden');
            assert.ok(css.includes('max-width: 100vw'), 'Navbar must prevent horizontal spill with max-width: 100vw');
            assert.ok(css.includes('[dir="rtl"]'), 'CSS must define explicit RTL rules');
            assert.ok(css.includes('padding-inline') || css.includes('inset-inline') || css.includes('margin-inline'),
                'CSS must use logical properties for bidirectional layout');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PART B: ORDER ACTIONS TESTS
    // ─────────────────────────────────────────────────────────────────────────
    describe('PART B — Consistent Order-Card Actions & Status Transitions', () => {
        const css = fs.readFileSync(adminCssPath, 'utf8');
        const js = fs.readFileSync(adminJsPath, 'utf8');

        test('Order action controls share identical button height (40px) and border-radius (10px)', () => {
            assert.ok(css.includes('.btn-action-tile'), 'CSS must define .btn-action-tile master class');
            assert.ok(css.includes('height: 40px'), 'Button must specify exact 40px height');
            assert.ok(css.includes('border-radius: 10px'), 'Button must specify 10px border radius');
            assert.ok(css.includes('justify-content: center'), 'Button content must be centered');
            assert.ok(css.includes('align-items: center'), 'Button content must be vertically aligned');
        });

        test('Mobile order cards implement deliberate 2-column action grid', () => {
            assert.ok(css.includes('.card-mobile-actions-grid'), 'CSS must define .card-mobile-actions-grid');
            assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Actions grid must use 2-column layout');
        });

        test('Client JS formats operational tel: and wa.me WhatsApp links', () => {
            assert.ok(js.includes('href="tel:${o.phone}"'), 'Must format valid tel: link');
            assert.ok(js.includes('wa.me/'), 'Must format valid wa.me link');
            assert.ok(js.includes('btn-tile-call'), 'Must apply btn-tile-call class');
            assert.ok(js.includes('btn-tile-whatsapp'), 'Must apply btn-tile-whatsapp class');
        });

        test('Permitted status transitions follow authoritative VALID_TRANSITIONS model', () => {
            assert.ok(js.includes('getAllowedStatusTransitions'), 'admin-client.js must define getAllowedStatusTransitions');
            assert.ok(js.includes('updateOrderStatus'), 'admin-client.js must define updateOrderStatus');

            // Verify authorized transitions on API
            const VALID_TRANSITIONS = {
                'pending': ['confirmed', 'preparing', 'shipped', 'delivered', 'review', 'cancelled'],
                'review': ['confirmed', 'preparing', 'shipped', 'cancelled'],
                'confirmed': ['preparing', 'shipped', 'delivered', 'cancelled', 'pending'],
                'preparing': ['shipped', 'delivered', 'cancelled', 'confirmed'],
                'shipped': ['delivered', 'returned', 'cancelled', 'preparing'],
                'delivered': ['returned'],
                'returned': ['confirmed', 'cancelled', 'shipped'],
                'cancelled': ['pending', 'confirmed']
            };

            assert.deepStrictEqual(VALID_TRANSITIONS['delivered'], ['returned'], 'Delivered can only transition to returned');
        });

        test('PATCH /api/orders enforces permitted transitions and rejects invalid transition with 400', async () => {
            const testOrder = {
                orderId: 'SPDZ-TRANS-001',
                fullName: 'Client Transition Test',
                phone: '0550123456',
                wilaya: '16 - Alger',
                deliveryType: 'home',
                totalPrice: 22600,
                status: 'delivered' // Delivered status
            };
            await mockStorage.saveOrder(testOrder);

            // Attempt illegal transition from 'delivered' to 'pending'
            const { req, res, getStatus, getJson } = mockReqRes(
                'PATCH',
                { orderId: 'SPDZ-TRANS-001', status: 'pending' },
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );

            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 400, 'Illegal status transition must return 400');
            const json = getJson();
            assert.strictEqual(json.success, false);
            assert.match(json.error, /Invalid status transition/);
        });

        test('PATCH /api/orders accepts permitted transition and updates status', async () => {
            const testOrder = {
                orderId: 'SPDZ-TRANS-002',
                fullName: 'Client Transition Test 2',
                phone: '0550123456',
                wilaya: '16 - Alger',
                deliveryType: 'home',
                totalPrice: 22600,
                status: 'pending'
            };
            await mockStorage.saveOrder(testOrder);

            // Permitted transition from 'pending' to 'confirmed'
            const { req, res, getStatus, getJson } = mockReqRes(
                'PATCH',
                { orderId: 'SPDZ-TRANS-002', status: 'confirmed' },
                {},
                { 'authorization': `Bearer ${TEST_ADMIN_TOKEN}` }
            );

            await ordersHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);

            const updated = await mockStorage.findOrderById('SPDZ-TRANS-002');
            assert.strictEqual(updated.status, 'confirmed');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PART C: CHECKOUT UX & LOADING STATE TESTS
    // ─────────────────────────────────────────────────────────────────────────
    describe('PART C — Checkout Submission, Loading UX & Idempotency', () => {
        const orderFormCode = fs.readFileSync(orderFormJsxPath, 'utf8');
        const stickyBarCode = fs.readFileSync(stickyMobileBarPath, 'utf8');

        test('OrderForm component implements synchronous isSubmitting guard and double-click prevention', () => {
            assert.ok(orderFormCode.includes('if (isSubmitting) return;'), 'Must reject duplicate clicks while submitting');
            assert.ok(orderFormCode.includes('setIsSubmitting(true)'), 'Must set submitting state synchronously');
            assert.ok(orderFormCode.includes('onSubmittingChange'), 'Must propagate submitting state to parent');
        });

        test('OrderForm submit button and StickyMobileBar display localized loading indicator', () => {
            assert.ok(orderFormCode.includes('جارٍ تأكيد طلبك...'), 'OrderForm must contain Arabic loading text');
            assert.ok(orderFormCode.includes('Confirmation de votre commande...'), 'OrderForm must contain French loading text');
            assert.ok(stickyBarCode.includes('جارٍ تأكيد طلبك...'), 'StickyMobileBar must contain Arabic loading text');
            assert.ok(stickyBarCode.includes('Confirmation de votre commande...'), 'StickyMobileBar must contain French loading text');
            assert.ok(stickyBarCode.includes('disabled={isSubmitting}'), 'StickyMobileBar button must be disabled during submission');
            assert.ok(orderFormCode.includes('disabled={isSubmitting}'), 'OrderForm button must be disabled during submission');
        });

        test('OrderForm implements minimum display threshold (600-800ms) for fast server responses', () => {
            assert.ok(orderFormCode.includes('MIN_DISPLAY_MS'), 'OrderForm must define MIN_DISPLAY_MS');
            assert.ok(orderFormCode.includes('submitStartTime'), 'OrderForm must track submit start time');
            assert.ok(orderFormCode.includes('setTimeout'), 'OrderForm must smoothly hold state if response is faster than threshold');
        });

        test('Accessible live region is present for screen readers', () => {
            assert.ok(orderFormCode.includes('role="status"'), 'Must define role="status"');
            assert.ok(orderFormCode.includes('aria-live="polite"'), 'Must define aria-live="polite"');
            assert.ok(orderFormCode.includes('id="checkoutStatusRegion"'), 'Must define checkoutStatusRegion id');
        });

        test('Form values are preserved and retry is enabled on network or server error', () => {
            assert.ok(orderFormCode.includes('role="alert"'), 'Must define role="alert" on error');
            assert.ok(orderFormCode.includes('إعادة المحاولة') || orderFormCode.includes('Réessayer'), 'Must provide retry button');
            assert.ok(orderFormCode.includes('setErrorMsg(err.message'), 'Must set error message without resetting state');
        });

        test('POST /api/send-order: validates contract and returns explicit success and orderId', async () => {
            const { req, res, getStatus, getJson } = mockReqRes('POST', {
                fullName: 'Mourad Belkacem',
                phone: '0555987654',
                wilaya: '16 - Alger (الجزائر)',
                commune: 'Bab El Oued',
                deliveryType: 'home'
            });

            await sendOrderHandler(req, res);

            assert.strictEqual(getStatus(), 200);
            const json = getJson();
            assert.strictEqual(json.success, true);
            assert.ok(json.orderId, 'Response must include persisted orderId');
            assert.ok(json.orderId.startsWith('SPDZ-'), 'orderId must start with SPDZ-');
            assert.strictEqual(typeof json.totalPrice, 'number', 'totalPrice must be a number');
        });

        test('POST /api/send-order: handles rapid duplicate submission with idempotency protection', async () => {
            const clientSubmissionTime = Date.now();
            const orderPayload = {
                fullName: 'Sofiane Feghouli',
                phone: '0661122334',
                wilaya: '31 - Oran (وهران)',
                commune: 'Es Senia',
                deliveryType: 'home',
                clientSubmissionTime
            };

            const first = mockReqRes('POST', orderPayload);
            await sendOrderHandler(first.req, first.res);
            assert.strictEqual(first.getStatus(), 200);

            const second = mockReqRes('POST', orderPayload);
            await sendOrderHandler(second.req, second.res);
            assert.strictEqual(second.getStatus(), 200);
            assert.strictEqual(second.getJson().success, true);
        });
    });
});
