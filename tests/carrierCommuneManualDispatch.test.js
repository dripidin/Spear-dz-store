'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const locationResolver = require('../lib/delivery/locationResolver');
const shippingRates = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'shippingRates.json'), 'utf8'));

test('SPEAR-DZ Comprehensive Regression Suite — Carrier Resolution, Manual Dispatch, Real Analytics & UI Cleanup', async (t) => {

    // ── 1. Wilaya & Commune Mapping Tests ─────────────────────────────────────
    await t.test('1. Commune supported for both Home and Stop Desk (e.g. Bab Ezzouar in Wilaya 16)', () => {
        const check = locationResolver.verifyDeliveryAvailability(16, 'Bab Ezzouar', 'desk');
        assert.strictEqual(check.available, true);
        assert.strictEqual(check.service, 'stopdesk');
        assert.strictEqual(check.commune, 'Bab Ezzouar');
        assert.strictEqual(check.hasStopDesk, true);

        const homeCheck = locationResolver.verifyDeliveryAvailability(16, 'Bab Ezzouar', 'home');
        assert.strictEqual(homeCheck.available, true);
        assert.strictEqual(homeCheck.service, 'home');
    });

    await t.test('2. Commune supported for Home delivery but NOT Desk delivery (Mechraa Safa bug case)', () => {
        // Mechraa Safa in Wilaya 14 (Tiaret) has no Redex stop desk
        const deskCheck = locationResolver.verifyDeliveryAvailability(14, 'Mechraa Safa', 'desk');
        assert.strictEqual(deskCheck.available, false);
        assert.strictEqual(deskCheck.code, 'STOPDESK_UNAVAILABLE');
        assert.strictEqual(deskCheck.alternative, 'home');
        assert.ok(deskCheck.message.includes('Stop desk non disponible'));

        // But Home delivery is available
        const homeCheck = locationResolver.verifyDeliveryAvailability(14, 'Mechraa Safa', 'home');
        assert.strictEqual(homeCheck.available, true);
        assert.strictEqual(homeCheck.service, 'home');
    });

    await t.test('3. Wilaya with 0 stop desks in Redex (e.g. Wilaya 51 Ouled Djellal)', () => {
        const deskCheck = locationResolver.verifyDeliveryAvailability(51, 'Ouled Djellal', 'desk');
        assert.strictEqual(deskCheck.available, false);
        assert.strictEqual(deskCheck.code, 'STOPDESK_UNAVAILABLE');

        const homeCheck = locationResolver.verifyDeliveryAvailability(51, 'Ouled Djellal', 'home');
        assert.strictEqual(homeCheck.available, true);
    });

    await t.test('4. Arabic and French resolution to canonical Redex municipality', () => {
        // Arabic input resolves to canonical French name recognized by Redex
        const arabicResult = locationResolver.resolveCommune(14, 'مشرع الصفا');
        assert.strictEqual(arabicResult.officialName, 'Mechraa Safa');

        const frenchResult = locationResolver.resolveCommune(14, 'Mechraa Safa');
        assert.strictEqual(frenchResult.officialName, 'Mechraa Safa');
    });

    await t.test('5. Accented versus unaccented municipality spellings', () => {
        const accented = locationResolver.resolveCommune(44, 'Aïn Defla');
        const unaccented = locationResolver.resolveCommune(44, 'Ain Defla');
        assert.strictEqual(accented.officialName, 'Ain Defla');
        assert.strictEqual(unaccented.officialName, 'Ain Defla');
    });

    await t.test('6. Unknown or ambiguous commune fallback preserves original input safely', () => {
        const unknown = locationResolver.resolveCommune(16, 'Zone Industrielle Non Reconnue');
        assert.strictEqual(unknown.matched, false);
        assert.strictEqual(unknown.officialName, 'Zone Industrielle Non Reconnue');
        assert.strictEqual(unknown.hasStopDesk, false);
    });

    // ── 2. Tariff Table 58 Wilayas Audit ──────────────────────────────────────
    await t.test('7. Tariff audit: Wilayas 49 to 58 have stopdeskAvailable = false and desk = null', () => {
        for (let w = 49; w <= 58; w++) {
            const rate = shippingRates[String(w)];
            assert.ok(rate, `Rate exists for wilaya ${w}`);
            assert.strictEqual(rate.stopdeskAvailable, false, `Wilaya ${w} must have stopdeskAvailable: false`);
            assert.strictEqual(rate.desk, null, `Wilaya ${w} must have desk: null`);
            assert.ok(rate.home > 0, `Wilaya ${w} has valid home price`);
        }
    });

    await t.test('8. Tariff audit: Wilayas 1 to 48 have valid home tariffs', () => {
        for (let w = 1; w <= 48; w++) {
            const rate = shippingRates[String(w)];
            assert.ok(rate, `Rate exists for wilaya ${w}`);
            assert.ok(typeof rate.home === 'number' && rate.home > 0);
        }
    });

    // ── 3. Admin UI Cleanliness & Layout ──────────────────────────────────────
    await t.test('9. Redundant #tableSearchInput is completely removed from admin.html', () => {
        const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
        assert.strictEqual(adminHtml.includes('id="tableSearchInput"'), false, 'tableSearchInput must be removed');
        assert.ok(adminHtml.includes('id="globalSearchInput"'), 'globalSearchInput must be present');
        assert.ok(adminHtml.includes('id="mobileSearchInput"'), 'mobileSearchInput must be present');
    });

    await t.test('10. Live integration status cards are present in orders header', () => {
        const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
        assert.ok(adminHtml.includes('id="cardStatusCourier"'), 'Must have courier status card');
        assert.ok(adminHtml.includes('id="cardStatusSupabase"'), 'Must have Supabase status card');
        assert.ok(adminHtml.includes('Supabase: Synchronisé ✅'), 'Must have Supabase label');
    });

    await t.test('11. Navigation shortcut سجل الطلبيات is removed, and صفحة المنتج points to /#orderForm', () => {
        const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
        assert.strictEqual(adminHtml.includes('<span>سجل الطلبيات</span>'), false, 'Shortcut سجل الطلبيات must be removed');
        assert.ok(adminHtml.includes('href="/#orderForm"'), 'Link to product page must exist');
        assert.ok(adminHtml.includes('<span>صفحة المنتج</span>'), 'Label must be صفحة المنتج');
        assert.ok(adminHtml.includes('<span>المتجر الرئيسي</span>'), 'Label must be المتجر الرئيسي');
    });

    // ── 4. Analytics Real Data Integrity ─────────────────────────────────────
    await t.test('12. Mockup numbers (1,480, 4,620, 3.8%, 2m 45s) are removed from admin.html initial state', () => {
        const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');
        assert.strictEqual(adminHtml.includes('>1,480<'), false, 'Fake visitors count 1,480 must be removed');
        assert.strictEqual(adminHtml.includes('>4,620<'), false, 'Fake pageviews count 4,620 must be removed');
        assert.strictEqual(adminHtml.includes('>2m 45s<'), false, 'Fake session duration 2m 45s must be removed');
        assert.strictEqual(adminHtml.includes('+18.4% cette semaine'), false, 'Fake growth label must be removed');
        assert.strictEqual(adminHtml.includes('Engagement optimal'), false, 'Fake engagement label must be removed');
    });

    await t.test('13. Client analytics code eliminates 2.8 multiplier and fake percentage fallbacks', () => {
        const adminJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'admin-client.js'), 'utf8');
        assert.strictEqual(adminJs.includes('* 2.8'), false, 'admin-client.js must not contain fake * 2.8 multiplier');
        assert.strictEqual(adminJs.includes("'2m 45s'"), false, 'admin-client.js must not contain hardcoded 2m 45s');
    });
});
