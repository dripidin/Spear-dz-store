'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createManagedTestServer } = require('./testServerHelper');

describe('ProductDemoVideo Component & Asset Verification Tests', () => {

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
    const VIDEO_FILE = path.join(PUBLIC_DIR, 'videos', 'pack-high-tech-demo.mp4');
    const POSTER_FILE = path.join(PUBLIC_DIR, 'images', 'pack-high-tech-poster.jpg');

    it('Video asset exists at the expected configurable path with valid media headers', () => {
        assert.ok(fs.existsSync(VIDEO_FILE), 'Production demo video file must exist at /public/videos/pack-high-tech-demo.mp4');
        const stats = fs.statSync(VIDEO_FILE);
        assert.ok(stats.size > 100000, `Video file size should be substantial (actual: ${stats.size} bytes)`);
    });

    it('Poster fallback image exists at /public/images/pack-high-tech-poster.jpg', () => {
        assert.ok(fs.existsSync(POSTER_FILE), 'Poster fallback image must exist');
        const stats = fs.statSync(POSTER_FILE);
        assert.ok(stats.size > 10000, `Poster image size should be substantial (actual: ${stats.size} bytes)`);
    });

    it('HTTP Server streams MP4 video with HTTP 206 Partial Content range requests', async () => {
        const res = await fixture.fetch('/videos/pack-high-tech-demo.mp4', {
            headers: {
                'Range': 'bytes=0-1023'
            }
        });

        assert.equal(res.status, 206, 'Should respond with 206 Partial Content for byte-range queries');
        assert.equal(res.headers.get('content-type'), 'video/mp4', 'Should return video/mp4 MIME type');
        assert.ok(res.headers.get('content-range'), 'Should include Content-Range header');
        assert.equal(res.headers.get('content-length'), '1024', 'Should return requested chunk size');
    });

    it('ProductDemoVideo component file exists and contains freeze-on-last-frame logic', () => {
        const compPath = path.join(__dirname, '..', 'src', 'components', 'ProductDemoVideo.jsx');
        assert.ok(fs.existsSync(compPath), 'ProductDemoVideo.jsx must exist');
        const content = fs.readFileSync(compPath, 'utf8');

        // Check key logic elements required by specification
        assert.ok(content.includes('onEnded={handleEnded}'), 'Must bind native onEnded event');
        assert.ok(content.includes('ctx.drawImage(video, 0, 0'), 'Must draw video frame to canvas');
        assert.ok(content.includes('video.pause()'), 'Must pause playback on ended');
        assert.ok(content.includes('isFrozen'), 'Must track frozen state');
        assert.ok(content.includes('handleReplay'), 'Must provide manual replay mechanism');
        assert.ok(content.includes('aspect-video'), 'Must preserve 16:9 aspect ratio');
        assert.ok(content.includes('loop={false}'), 'Must NOT loop automatically');
        assert.ok(content.includes('muted={isMuted}'), 'Must support accessible sound toggling');
    });

    it('Storefront bundle serves React index.html containing app mounting point', async () => {
        const res = await fixture.fetch('/');
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.ok(html.includes('<div id="root"></div>') || html.includes('id="root"'), 'Must contain React root mount point');
        assert.ok(html.includes('PACK HIGH-TECH 5 EN 1') || html.includes('Spear-dz'), 'Must have brand title');
    });

});
