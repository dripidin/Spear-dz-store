'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { validateStoreConfig } = require('../lib/configValidator');

describe('Store Configuration Validation Tests', () => {
    test('Validates official store.config.json successfully', () => {
        const config = validateStoreConfig();
        assert.ok(config);
        assert.strictEqual(config.store.id, 'spear_dz');
        assert.strictEqual(config.bundle.id, 'pack_hightech_5in1');
        assert.strictEqual(config.bundle.price, 20400);
        assert.strictEqual(config.bundle.components.length, 5);
    });

    test('All 5 bundle components have verified specifications and images', () => {
        const config = validateStoreConfig();
        const components = config.bundle.components;
        const expectedIds = ['smartphone', 'headphones', 'charger', 'powerbank', 'cable'];

        expectedIds.forEach(id => {
            const found = components.find(c => c.id === id);
            assert.ok(found, `Component with id ${id} must exist`);
            assert.ok(found.name_ar, `Component ${id} must have Arabic name`);
            assert.ok(found.specs_ar, `Component ${id} must have Arabic specs`);
            assert.ok(found.image, `Component ${id} must have image path`);
        });
    });

    test('Throws clear error on missing file', () => {
        assert.throws(() => {
            validateStoreConfig(path.join(__dirname, 'non_existent_config.json'));
        }, /Store configuration file not found/);
    });
});
