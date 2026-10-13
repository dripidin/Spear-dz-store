'use strict';

const SupabaseStorage = require('./supabaseStorage');
const MockStorage = require('./mockStorage');
const GoogleSheetsStorage = require('./googleSheetsStorage');

let activeStorageInstance = null;

/**
 * Resolves the persistent storage backend according to mandatory architecture rules.
 * Supabase is the primary production database of record.
 * MockStorage is permitted ONLY for isolated unit tests or explicit local mock testing.
 * Google Sheets is never a silent fallback or default.
 */
function resolveStorageBackend() {
    const configured = (process.env.STORAGE_BACKEND || '').trim().toLowerCase();

    // Isolated unit testing or explicit mock dev mode
    if (configured === 'memory_mock' || configured === 'mock' || process.env.NODE_ENV === 'test') {
        return 'memory_mock';
    }

    // Explicit secondary sheet adapter if specifically requested
    if (configured === 'google_sheets' || configured === 'sheets') {
        return 'google_sheets';
    }

    // Default and required production source of truth is Supabase
    return 'supabase';
}

/**
 * Returns the active storage instance with strict validation.
 * Fails loud if Supabase is unconfigured in production. Never masquerades or falls back silently.
 */
function getStorage() {
    if (activeStorageInstance) {
        return activeStorageInstance;
    }

    const backend = resolveStorageBackend();

    if (backend === 'memory_mock') {
        activeStorageInstance = new MockStorage();
        return activeStorageInstance;
    }

    if (backend === 'supabase') {
        const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

        if (!supabaseUrl || !supabaseKey) {
            throw new Error(
                "CRITICAL ARCHITECTURE ERROR: STORAGE_BACKEND is resolved to 'supabase' (mandatory production database), but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Never save orders to silent fallbacks. Please configure Supabase in your environment."
            );
        }
        activeStorageInstance = new SupabaseStorage();
        return activeStorageInstance;
    }

    if (backend === 'google_sheets') {
        if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
            throw new Error(
                "STORAGE_BACKEND is set to 'google_sheets' but required credentials are missing. Silent fallback is prohibited."
            );
        }
        activeStorageInstance = new GoogleSheetsStorage();
        return activeStorageInstance;
    }

    throw new Error(`Unsupported STORAGE_BACKEND: ${backend}`);
}

function setStorageInstance(instance) {
    activeStorageInstance = instance;
}

module.exports = {
    getStorage,
    setStorageInstance,
    resolveStorageBackend,
    MockStorage,
    SupabaseStorage
};
