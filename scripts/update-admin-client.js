const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');
let code = fs.readFileSync(filePath, 'utf8');

// Normalize to LF
let lines = code.replace(/\r\n/g, '\n').split('\n');

// 1. Check if getAuthHeaders already exists
if (!code.includes('getAuthHeaders')) {
    const initAuthIndex = lines.findIndex(l => l.includes('initAuthCheck: function () {'));
    if (initAuthIndex !== -1) {
        const getAuthHeadersBlock = [
            '        getAuthHeaders: function () {',
            "            const token = sessionStorage.getItem('orva_admin_token') || localStorage.getItem('spdz_admin_token') || '';",
            "            const headers = { 'Content-Type': 'application/json' };",
            '            if (token) {',
            "                headers['Authorization'] = 'Bearer ' + token;",
            "                headers['X-Admin-Token'] = token;",
            '            }',
            '            return headers;',
            '        },',
            ''
        ];
        lines.splice(initAuthIndex, 0, ...getAuthHeadersBlock);
        console.log('✓ Inserted getAuthHeaders');
    }
}

// 2. Enhance initAuthCheck for dual storage
let updatedCode = lines.join('\n');

const oldInit = `        initAuthCheck: function () {
            const overlay = document.getElementById('adminAuthOverlay');
            if (!overlay) return;
            const isAuth = sessionStorage.getItem('orva_admin_logged') === 'true';
            if (isAuth) {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
                setTimeout(() => {
                    document.getElementById('adminAuthPassword')?.focus();
                }, 300);
            }
        },`;

const newInit = `        initAuthCheck: function () {
            const overlay = document.getElementById('adminAuthOverlay');
            if (!overlay) return;
            const token = sessionStorage.getItem('orva_admin_token') || localStorage.getItem('spdz_admin_token');
            const isAuth = sessionStorage.getItem('orva_admin_logged') === 'true' || !!token;
            if (isAuth) {
                if (token) {
                    sessionStorage.setItem('orva_admin_token', token);
                    sessionStorage.setItem('orva_admin_logged', 'true');
                    localStorage.setItem('spdz_admin_token', token);
                }
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
                setTimeout(() => {
                    document.getElementById('adminAuthPassword')?.focus();
                }, 300);
            }
        },`;

if (updatedCode.includes(oldInit)) {
    updatedCode = updatedCode.replace(oldInit, newInit);
    console.log('✓ Updated initAuthCheck');
}

// 3. In handleAuthSubmit: save token to both sessionStorage and localStorage
const oldTokenSave = `                    if (data.token) {
                        sessionStorage.setItem('orva_admin_token', data.token);
                    }`;

const newTokenSave = `                    const validToken = data.token || data.sessionToken || pass;
                    if (validToken) {
                        sessionStorage.setItem('orva_admin_token', validToken);
                        localStorage.setItem('spdz_admin_token', validToken);
                    }`;

if (updatedCode.includes(oldTokenSave)) {
    updatedCode = updatedCode.replace(oldTokenSave, newTokenSave);
    console.log('✓ Updated handleAuthSubmit token persistence');
}

// 4. In logout: clear localStorage token
const oldLogout = `        logout: function () {
            sessionStorage.removeItem('orva_admin_logged');
            sessionStorage.removeItem('orva_admin_token');`;

const newLogout = `        logout: function () {
            sessionStorage.removeItem('orva_admin_logged');
            sessionStorage.removeItem('orva_admin_token');
            localStorage.removeItem('spdz_admin_token');`;

if (updatedCode.includes(oldLogout)) {
    updatedCode = updatedCode.replace(oldLogout, newLogout);
    console.log('✓ Updated logout cleanup');
}

// 5. In fetchOrders: add headers: this.getAuthHeaders() and fallback to /api/orders
const oldFetch = `            try {
                const res = await fetch('/api/delivery?action=get_all_orders');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    ordersList = json.data;`;

const newFetch = `            try {
                let res = await fetch('/api/delivery?action=get_all_orders', { headers: this.getAuthHeaders() });
                if (!res.ok) {
                    res = await fetch('/api/orders', { headers: this.getAuthHeaders() });
                }
                const json = await res.json().catch(() => ({}));
                const orders = Array.isArray(json.data) ? json.data : (Array.isArray(json.orders) ? json.orders : []);
                if (json.success && orders) {
                    ordersList = orders;`;

if (updatedCode.includes(oldFetch)) {
    updatedCode = updatedCode.replace(oldFetch, newFetch);
    console.log('✓ Updated fetchOrders headers and fallback');
}

fs.writeFileSync(filePath, updatedCode, 'utf8');
console.log('Successfully saved updated public/js/admin-client.js');
