'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { getStorage, resolveStorageBackend, setStorageInstance } = require('../lib/storage');

describe('Supabase-First Architecture & Persistence Tests', () => {

    it('STORAGE_BACKEND strictly resolves to supabase for production persistence', () => {
        const origEnv = process.env.STORAGE_BACKEND;
        delete process.env.STORAGE_BACKEND;
        const origNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const backend = resolveStorageBackend();
        assert.equal(backend, 'supabase', 'Production default must strictly be supabase');

        process.env.STORAGE_BACKEND = origEnv;
        process.env.NODE_ENV = origNodeEnv;
    });

    it('Fails with explicit operational error if Supabase credentials are missing (No Silent Fallback)', () => {
        setStorageInstance(null);
        const origUrl = process.env.SUPABASE_URL;
        delete process.env.SUPABASE_URL;
        const origBackend = process.env.STORAGE_BACKEND;
        process.env.STORAGE_BACKEND = 'supabase';

        assert.throws(() => {
            getStorage();
        }, /CRITICAL ARCHITECTURE ERROR/);

        process.env.SUPABASE_URL = origUrl;
        process.env.STORAGE_BACKEND = origBackend;
        setStorageInstance(null);
    });

    it('Live Supabase health check validates against configured project', async () => {
        const storage = getStorage();
        const health = await storage.verifyHealth();
        assert.equal(health.ok, true, 'Supabase health check should return ok: true');
        assert.equal(health.provider, 'supabase');
        assert.ok(health.url.includes('supabase.co'));
    });

    it('Persists and retrieves an order in live Supabase database', async () => {
        const storage = getStorage();
        const testOrderId = 'TEST-VERIF-' + Math.floor(100000 + Math.random() * 900000);

        const orderData = {
            orderId: testOrderId,
            storeId: 'spear_dz',
            fullName: 'Test Verif Customer',
            phone: '0555998877',
            wilaya: '16 - Alger',
            commune: 'Hydra',
            deliveryType: 'home',
            productName: 'PACK HIGH-TECH 5 EN 1',
            quantity: 1,
            unitPrice: 21900,
            shippingFee: 500,
            totalPrice: 22400,
            status: 'pending',
            courier: 'manual'
        };

        // 1. Save
        const saved = await storage.saveOrder(orderData, { score: 10, level: 'LOW', decision: 'ALLOW' });
        assert.equal(saved.orderId, testOrderId);

        // 2. Fetch
        const fetched = await storage.findOrderById(testOrderId);
        assert.ok(fetched, 'Must be retrievable from Supabase');
        assert.equal(fetched.orderId, testOrderId);
        assert.equal(fetched.totalPrice, 22400);
        assert.equal(fetched.unitPrice, 21900);
        assert.equal(fetched.phone, '0555998877');
    });

    it('Version-controlled SQL migrations exist and contain all required tables and RLS', () => {
        const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
        assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Required tables
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.orders'), 'Must define orders table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.order_items'), 'Must define order_items table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.customers'), 'Must define customers table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.products'), 'Must define products table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.inventory'), 'Must define inventory table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.risk_events'), 'Must define risk_events table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.watchlist'), 'Must define watchlist table');
        assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.audit_logs'), 'Must define audit_logs table');

        // Row Level Security
        assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable RLS');
    });

});
