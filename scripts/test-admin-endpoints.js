'use strict';

async function test() {
    console.log('--- 1. Testing /api/auth ---');
    let res = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'L3abedstore2026' })
    });
    console.log('POST /api/auth status:', res.status);
    let data = await res.json();
    console.log('POST /api/auth response:', data);

    console.log('\n--- 2. Testing /api/admin/auth ---');
    res = await fetch('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'L3abedstore2026' })
    });
    console.log('POST /api/admin/auth status:', res.status);
    data = await res.json();
    console.log('POST /api/admin/auth response:', data);

    console.log('\n--- 3. Testing /api/orders with Bearer token ---');
    res = await fetch('http://localhost:3000/api/orders', {
        headers: { 'Authorization': 'Bearer L3abedstore2026' }
    });
    console.log('GET /api/orders status:', res.status);
    data = await res.json();
    console.log('GET /api/orders count:', data.count, 'success:', data.success);

    console.log('\n--- 4. Testing /api/delivery?action=get_all_orders ---');
    res = await fetch('http://localhost:3000/api/delivery?action=get_all_orders', {
        headers: { 'Authorization': 'Bearer L3abedstore2026' }
    });
    console.log('GET /api/delivery status:', res.status);
    data = await res.json();
    console.log('GET /api/delivery count:', data.count, 'success:', data.success);

    console.log('\n--- 5. Testing /admin HTML ---');
    res = await fetch('http://localhost:3000/admin');
    console.log('GET /admin status:', res.status, 'content-type:', res.headers.get('content-type'));
    const html = await res.text();
    console.log('GET /admin content length:', html.length, 'has adminAuthOverlay:', html.includes('adminAuthOverlay'));
}

test().catch(console.error);
