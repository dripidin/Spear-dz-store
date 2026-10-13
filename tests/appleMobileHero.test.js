'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createManagedTestServer } = require('./testServerHelper');

describe('Apple Redesign & Mobile 3:4 Video Player Tests', () => {

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
    const VIDEO_LAYER_2 = path.join(PUBLIC_DIR, 'videos', 'video-layer-2.mp4');
    const LAST_FRAME_IMG = path.join(PUBLIC_DIR, 'images', 'last-frame-video.png');
    const MOBILE_HERO_JSX = path.join(__dirname, '..', 'src', 'components', 'MobileHeroVideo.jsx');
    const HERO_JSX = path.join(__dirname, '..', 'src', 'components', 'Hero.jsx');
    const INDEX_CSS = path.join(__dirname, '..', 'src', 'index.css');

    it('Video layer 2 asset exists at /public/videos/video-layer-2.mp4 with valid size', () => {
        assert.ok(fs.existsSync(VIDEO_LAYER_2), 'video-layer-2.mp4 must exist in public/videos/');
        const stats = fs.statSync(VIDEO_LAYER_2);
        assert.ok(stats.size > 500000, `Video file size should be substantial (actual: ${stats.size} bytes)`);
    });

    it('Last frame video image exists at /public/images/last-frame-video.png with valid size', () => {
        assert.ok(fs.existsSync(LAST_FRAME_IMG), 'last-frame-video.png must exist in public/images/');
        const stats = fs.statSync(LAST_FRAME_IMG);
        assert.ok(stats.size > 100000, `Last frame image size should be substantial (actual: ${stats.size} bytes)`);
    });

    it('MobileHeroVideo component enforces 3:4 portrait rectangle with white framing', () => {
        assert.ok(fs.existsSync(MOBILE_HERO_JSX), 'MobileHeroVideo.jsx component must exist');
        const content = fs.readFileSync(MOBILE_HERO_JSX, 'utf8');

        // 3:4 aspect ratio
        assert.ok(content.includes('aspect-[3/4]'), 'Must enforce 3:4 aspect ratio rectangle');
        // White framing
        assert.ok(content.includes('bg-white') && content.includes('border-4 border-white'), 'Must feature white framing');
        // Target video and last frame image
        assert.ok(content.includes('/videos/video-layer-2.mp4'), 'Must default to /videos/video-layer-2.mp4');
        assert.ok(content.includes('/images/last-frame-video.png'), 'Must default to /images/last-frame-video.png');
        // Millisecond freeze logic on ended
        assert.ok(content.includes('onEnded={handleEnded}'), 'Must bind onEnded event handler');
        assert.ok(content.includes('isEnded'), 'Must track isEnded state');
        assert.ok(content.includes('handleReplay'), 'Must support interactive replay');
    });

    it('Hero section adopts Apple #design architecture and restricts video flow to mobile only', () => {
        assert.ok(fs.existsSync(HERO_JSX), 'Hero.jsx must exist');
        const content = fs.readFileSync(HERO_JSX, 'utf8');

        // Apple #design selector from devtools chat
        assert.ok(content.includes('id="design"'), 'Must have id="design"');
        assert.ok(content.includes('product-viewer-component'), 'Must have .product-viewer-component');
        assert.ok(content.includes('viewport-content'), 'Must have .viewport-content');
        assert.ok(content.includes('ric-type-lockup'), 'Must have .ric-type-lockup');

        // Mobile-only vs Desktop separation
        assert.ok(content.includes('block lg:hidden'), 'Must isolate mobile smartphone experience (< 1024px)');
        assert.ok(content.includes('hidden lg:grid') || content.includes('hidden lg:block'), 'Must isolate desktop product viewer');
        assert.ok(content.includes('<MobileHeroVideo'), 'Must render MobileHeroVideo on mobile');
        assert.ok(content.includes('21,900'), 'Must present the 21,900 DZD offer');
    });

    it('Off-white Apple parchment theme (#f5f5f7) is defined in CSS design tokens', () => {
        assert.ok(fs.existsSync(INDEX_CSS), 'index.css must exist');
        const content = fs.readFileSync(INDEX_CSS, 'utf8');

        assert.ok(content.includes('#f5f5f7'), 'Must define #f5f5f7 off-white parchment token');
        assert.ok(content.includes('#0071e3'), 'Must define #0071e3 Apple Blue accent');
        assert.ok(content.includes('#1d1d1f'), 'Must define #1d1d1f Apple ink color');
    });

    it('HTTP server successfully serves video-layer-2.mp4 with 206 Partial Content streaming', async () => {
        const res = await fixture.fetch('/videos/video-layer-2.mp4', {
            headers: {
                'Range': 'bytes=0-1023'
            }
        });

        assert.equal(res.status, 206, 'Should respond with 206 Partial Content for video-layer-2.mp4');
        assert.equal(res.headers.get('content-type'), 'video/mp4');
        assert.ok(res.headers.get('content-range'));
    });

    it('HTTP server successfully serves last-frame-video.png with image/png MIME type', async () => {
        const res = await fixture.fetch('/images/last-frame-video.png');
        assert.equal(res.status, 200, 'Should return 200 OK for last-frame-video.png');
        assert.equal(res.headers.get('content-type'), 'image/png');
    });

});
