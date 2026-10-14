'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createManagedTestServer } = require('./testServerHelper');

describe('Stitch Cupertino Pure & Clean Video Transition Tests', () => {

    let fixture;

    before(async () => {
        fixture = await createManagedTestServer();
    });

    after(async () => {
        if (fixture) {
            await fixture.close();
        }
    });

    const PUBLIC_DIR = path.join(__dirname, '..', 'public');
    const VIDEO_FILE = path.join(PUBLIC_DIR, 'videos', 'video-products-bundl.mp4');
    const IMAGE_FILE = path.join(PUBLIC_DIR, 'images', 'last-frame-16-9.jpg');
    const COMMUNES_FILE = path.join(__dirname, '..', 'config', 'communes.json');
    const HERO_JSX = path.join(__dirname, '..', 'src', 'components', 'CupertinoVideoHero.jsx');
    const FORM_JSX = path.join(__dirname, '..', 'src', 'components', 'OrderForm.jsx');
    const BAR_JSX = path.join(__dirname, '..', 'src', 'components', 'StickyMobileBar.jsx');
    const APP_JSX = path.join(__dirname, '..', 'src', 'App.jsx');

    it('Video asset video-products-bundl.mp4 exists in public/videos with valid size', () => {
        assert.ok(fs.existsSync(VIDEO_FILE), 'video-products-bundl.mp4 must exist in public/videos');
        const stats = fs.statSync(VIDEO_FILE);
        assert.ok(stats.size > 500000, `Video file size must be substantial (actual: ${stats.size})`);
    });

    it('Last frame asset last-frame-16-9.jpg exists in public/images with valid size', () => {
        assert.ok(fs.existsSync(IMAGE_FILE), 'last-frame-16-9.jpg must exist in public/images');
        const stats = fs.statSync(IMAGE_FILE);
        assert.ok(stats.size > 500000, `Image file size must be substantial (actual: ${stats.size})`);
    });

    it('DZShip communes dataset exists with 1541 official Algerian communes', () => {
        assert.ok(fs.existsSync(COMMUNES_FILE), 'communes.json must exist in config/');
        const data = JSON.parse(fs.readFileSync(COMMUNES_FILE, 'utf8'));
        assert.ok(Array.isArray(data), 'communes must be an array');
        assert.ok(data.length >= 1500, `Must have >= 1500 communes (actual: ${data.length})`);
    });

    it('CupertinoVideoHero binds automatic playback and last frame 16-9 freeze with 180deg gradient', () => {
        assert.ok(fs.existsSync(HERO_JSX), 'CupertinoVideoHero.jsx must exist');
        const content = fs.readFileSync(HERO_JSX, 'utf8');

        // Target media
        assert.ok(content.includes('/videos/video-products-bundl.mp4'), 'Must play video-products-bundl.mp4');
        assert.ok(content.includes('/images/last-frame-16-9.jpg'), 'Must overlay last-frame-16-9.jpg');

        // Freeze logic
        assert.ok(content.includes('onEnded={handleEnded}'), 'Must bind onEnded');
        assert.ok(content.includes('isEnded'), 'Must track isEnded state');

        // Strict: NO overlay buttons or replay controls
        assert.ok(!content.includes('<button'), 'Must NOT contain any button elements');
        assert.ok(!content.includes('handleReplay'), 'Must NOT contain handleReplay');

        // White gradient merge
        assert.ok(content.includes('linear-gradient(rgba(255, 255, 255, 0) 30%, rgb(255, 255, 255) 60%)'), 'Must feature white linear gradient merge');
        assert.ok(content.includes("height: '80%'"), 'Must set video and last frame image height to 80%');
    });

    it('OrderForm implements exact headline, Stopdesk label, 40px margin, and dynamic communes', () => {
        assert.ok(fs.existsSync(FORM_JSX), 'OrderForm.jsx must exist');
        const content = fs.readFileSync(FORM_JSX, 'utf8');

        assert.ok(content.includes('باك جامي يجي في بالك استغل الفرصة !'), 'Must feature exact Arabic headline');
        assert.ok(content.includes('مكتب التوصيل(Stopdesk)'), 'Must feature exact Stopdesk label');
        assert.ok(content.includes("marginBottom: '40px'"), 'Must set section marginBottom to 40px');
        assert.ok(content.includes('filteredCommunes'), 'Must filter communes by selected wilaya');
        assert.ok(content.includes('wilayas.map'), 'Must support 58 Wilayas');
    });

    it('App header implements SPEAR DZ and 8px bottom margin', () => {
        assert.ok(fs.existsSync(APP_JSX), 'App.jsx must exist');
        const content = fs.readFileSync(APP_JSX, 'utf8');

        assert.ok(content.includes('SPEAR.DZ') || content.includes('SPEAR DZ'), 'Must show SPEAR.DZ logo text');
        assert.ok(content.includes("marginBottom: '8px'"), 'Must set header marginBottom to 8px');
    });

    it('StickyMobileBar implements floating glass bar with 21,900 DZD, black pill CTA and docking transition', () => {
        assert.ok(fs.existsSync(BAR_JSX), 'StickyMobileBar.jsx must exist');
        const content = fs.readFileSync(BAR_JSX, 'utf8');

        assert.ok(content.includes('floatingBar'), 'Must contain floatingBar id');
        assert.ok(content.includes('21,900 DZD'), 'Must show 21,900 DZD');
        assert.ok(content.includes('bg-primary text-on-primary rounded-full'), 'Must use black pill CTA button');
        assert.ok(content.includes('translate-y-full opacity-0 pointer-events-none'), 'Must support smooth docking hide');
        assert.ok(content.includes('hidden = false') || content.includes('hidden'), 'Must accept hidden prop');
    });

    it('OrderForm docks floating CTA via visibility observer and fires client Purchase event with eventID', () => {
        assert.ok(fs.existsSync(FORM_JSX), 'OrderForm.jsx must exist');
        const content = fs.readFileSync(FORM_JSX, 'utf8');

        assert.ok(content.includes('onButtonVisibilityChange'), 'OrderForm must accept onButtonVisibilityChange callback');
        assert.ok(content.includes('submitBtnRef'), 'OrderForm must attach submitBtnRef to submit button');
        assert.ok(content.includes("fbq('track', 'Purchase'"), 'OrderForm must track client-side Purchase event on success');
        assert.ok(content.includes('eventID: data.orderId'), 'Must provide matching eventID for Meta CAPI deduplication');
    });

    it('App binds form button visibility to dock StickyMobileBar when user reaches form button', () => {
        assert.ok(fs.existsSync(APP_JSX), 'App.jsx must exist');
        const content = fs.readFileSync(APP_JSX, 'utf8');

        assert.ok(content.includes('isFormButtonVisible'), 'App must manage isFormButtonVisible state');
        assert.ok(content.includes('onButtonVisibilityChange={setIsFormButtonVisible}'), 'App must wire visibility callback to OrderForm');
        assert.ok(content.includes('hidden={isFormButtonVisible}'), 'App must pass hidden prop to StickyMobileBar');
    });

    it('HTTP Server streams video-products-bundl.mp4 with 206 Partial Content', async () => {
        const res = await fixture.fetch('/videos/video-products-bundl.mp4', {
            headers: {
                'Range': 'bytes=0-1023'
            }
        });

        assert.equal(res.status, 206);
        assert.equal(res.headers.get('content-type'), 'video/mp4');
        assert.ok(res.headers.get('content-range'));
    });

    it('HTTP Server serves last-frame-16-9.jpg with image/jpeg MIME type', async () => {
        const res = await fixture.fetch('/images/last-frame-16-9.jpg');
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'image/jpeg');
    });

});
