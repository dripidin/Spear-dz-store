'use strict';
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'reference-yamahasac', 'admin.js');
const destPath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');

let js = fs.readFileSync(srcPath, 'utf8');

// 1. Dual LocalStorage + SessionStorage Auth Check
const oldInitAuthCheck = `initAuthCheck: function () {
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

const newInitAuthCheck = `getAuthToken: function () {
            return localStorage.getItem('spdz_admin_token') || 
                   sessionStorage.getItem('spdz_admin_token') || 
                   sessionStorage.getItem('orva_admin_token') || '';
        },

        getAuthHeaders: function () {
            const token = this.getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
                headers['x-admin-token'] = token;
            }
            return headers;
        },

        initAuthCheck: function () {
            const overlay = document.getElementById('adminAuthOverlay');
            if (!overlay) return;
            const token = this.getAuthToken();
            const isAuth = (
                localStorage.getItem('spdz_admin_logged') === 'true' || 
                sessionStorage.getItem('orva_admin_logged') === 'true' || 
                !!token
            );
            if (isAuth) {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
                setTimeout(() => {
                    document.getElementById('adminAuthPassword')?.focus();
                }, 300);
            }
        },`;

js = js.replace(oldInitAuthCheck, newInitAuthCheck);

// 2. Multi-Endpoint Robust handleAuthSubmit
const oldHandleAuth = `handleAuthSubmit: async function (e) {
            if (e) e.preventDefault();
            const input = document.getElementById('adminAuthPassword');
            const err = document.getElementById('adminAuthError');
            const submitBtn = document.querySelector('.auth-btn-submit');
            const pass = input ? input.value.trim() : '';

            if (!pass) return;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
            }

            try {
                // Verify against Vercel backend environment key (ADMIN_PASSWORD)
                let res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                });

                // Fallback to /api/delivery?action=login if /api/auth returns 404
                if (res.status === 404) {
                    res = await fetch('/api/delivery?action=login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: pass })
                    });
                }

                const data = await res.json().catch(() => ({}));

                if (res.ok && data.success) {
                    sessionStorage.setItem('orva_admin_logged', 'true');
                    if (data.token) {
                        sessionStorage.setItem('orva_admin_token', data.token);
                    }
                    const overlay = document.getElementById('adminAuthOverlay');
                    if (overlay) overlay.style.display = 'none';
                    if (err) err.style.display = 'none';
                    this.fetchOrders(true);
                } else {
                    if (err) {
                        err.textContent = currentLang === 'fr' 
                            ? 'Mot de passe incorrect. Veuillez vérifier la variable ADMIN_PASSWORD sur Vercel.' 
                            : 'كلمة المرور غير صحيحة. يرجى التأكد من مفتاح ADMIN_PASSWORD في Vercel.';
                        err.style.display = 'block';
                    }
                    if (input) {
                        input.value = '';
                        input.focus();
                    }
                }
            } catch (networkErr) {
                console.warn('[Admin Auth Network Error]:', networkErr);
                if (err) {
                    err.textContent = currentLang === 'fr' 
                        ? 'Erreur réseau lors de la vérification du mot de passe.' 
                        : 'حدث خطأ في الاتصال أثناء التحقق من كلمة السر.';
                    err.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            }
        },`;

const newHandleAuth = `handleAuthSubmit: async function (e) {
            if (e) e.preventDefault();
            const input = document.getElementById('adminAuthPassword');
            const err = document.getElementById('adminAuthError');
            const submitBtn = document.querySelector('.auth-btn-submit');
            const pass = input ? input.value.trim() : '';

            if (!pass) return;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
            }

            try {
                let res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass, token: pass })
                });

                if (res.status === 404) {
                    res = await fetch('/api/admin/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: pass, password: pass })
                    });
                }

                if (res.status === 404) {
                    res = await fetch('/api/delivery?action=login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ password: pass, token: pass })
                    });
                }

                const data = await res.json().catch(() => ({}));

                if (res.ok && data.success) {
                    const token = data.token || data.sessionToken || pass;
                    localStorage.setItem('spdz_admin_logged', 'true');
                    localStorage.setItem('spdz_admin_token', token);
                    sessionStorage.setItem('orva_admin_logged', 'true');
                    sessionStorage.setItem('orva_admin_token', token);
                    sessionStorage.setItem('spdz_admin_token', token);

                    const overlay = document.getElementById('adminAuthOverlay');
                    if (overlay) overlay.style.display = 'none';
                    if (err) err.style.display = 'none';
                    this.fetchOrders(true);
                } else {
                    if (err) {
                        err.textContent = currentLang === 'fr' 
                            ? 'Mot de passe incorrect. Veuillez vérifier la variable ADMIN_API_TOKEN sur Vercel.' 
                            : 'كلمة المرور غير صحيحة. يرجى التأكد من مفتاح ADMIN_API_TOKEN في Vercel.';
                        err.style.display = 'block';
                    }
                    if (input) {
                        input.value = '';
                        input.focus();
                    }
                }
            } catch (networkErr) {
                console.warn('[Admin Auth Network Error]:', networkErr);
                if (err) {
                    err.textContent = currentLang === 'fr' 
                        ? 'Erreur réseau lors de la vérification du mot de passe.' 
                        : 'حدث خطأ في الاتصال أثناء التحقق من كلمة السر.';
                    err.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                }
            }
        },`;

js = js.replace(oldHandleAuth, newHandleAuth);

// 3. Logout clears both local and session storage
const oldLogout = `logout: function () {
            sessionStorage.removeItem('orva_admin_logged');
            sessionStorage.removeItem('orva_admin_token');
            const overlay = document.getElementById('adminAuthOverlay');
            if (overlay) overlay.style.display = 'flex';
            const input = document.getElementById('adminAuthPassword');
            if (input) {
                input.value = '';
                input.focus();
            }
        },`;

const newLogout = `logout: function () {
            localStorage.removeItem('spdz_admin_logged');
            localStorage.removeItem('spdz_admin_token');
            sessionStorage.removeItem('orva_admin_logged');
            sessionStorage.removeItem('orva_admin_token');
            sessionStorage.removeItem('spdz_admin_token');
            const overlay = document.getElementById('adminAuthOverlay');
            if (overlay) overlay.style.display = 'flex';
            const input = document.getElementById('adminAuthPassword');
            if (input) {
                input.value = '';
                input.focus();
            }
        },`;

js = js.replace(oldLogout, newLogout);

// 4. Update fetchOrders with auth headers and fallback
const oldFetchOrders = `const res = await fetch('/api/delivery?action=get_all_orders');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    ordersList = json.data;`;

const newFetchOrders = `let res = await fetch('/api/delivery?action=get_all_orders', { headers: this.getAuthHeaders() });
                if (!res.ok) {
                    res = await fetch('/api/orders', { headers: this.getAuthHeaders() });
                }
                const json = await res.json();
                let list = null;
                if (json.success && Array.isArray(json.data)) {
                    list = json.data;
                } else if (Array.isArray(json)) {
                    list = json;
                } else if (Array.isArray(json.orders)) {
                    list = json.orders;
                } else if (Array.isArray(json.data)) {
                    list = json.data;
                }
                if (list) {
                    ordersList = list;`;

js = js.replace(oldFetchOrders, newFetchOrders);

// 5. Update fetchAnalytics with auth headers
js = js.replace(
    `const res = await fetch('/api/delivery?action=analytics');`,
    `const res = await fetch('/api/delivery?action=analytics', { headers: this.getAuthHeaders() });`
);

// 6. Update deleteColis with auth headers and fallback
js = js.replace(
    `const res = await fetch(\`/api/delivery?action=delete&id=\${orderId}\`, { method: 'DELETE' });`,
    `let res = await fetch(\`/api/delivery?action=delete&id=\${orderId}\`, { method: 'DELETE', headers: this.getAuthHeaders() });
                if (!res.ok) {
                    res = await fetch(\`/api/orders?orderId=\${orderId}\`, { method: 'DELETE', headers: this.getAuthHeaders() });
                }`
);

// 7. Update createColis payload default product
js = js.replace(
    `let resolvedPName = 'PACK 4EN1 4950';`,
    `let resolvedPName = 'PACK HIGH-TECH 5 EN 1';`
);

// 8. Replace ORVA branding in JS strings
js = js.replace(/ORVA STORE/g, 'SPEAR.DZ');
js = js.replace(/ORVA-59067/g, 'SPDZ-59067');

// 9. Upgrade exportExcel to generate real CSV with UTF-8 BOM
const exportRegex = /exportExcel:\s*function\s*\(\)\s*\{[\s\S]*?window\.open\([^)]+\);[\s\S]*?\}/;

const newExport = `exportExcel: function () {
            if (!ordersList || ordersList.length === 0) {
                alert(currentLang === 'fr' ? 'Aucune commande à exporter.' : 'لا توجد طلبات لتصديرها حالياً.');
                return;
            }
            const headers = [
                'ID Commande / رقم الطلب',
                'Date / التاريخ',
                'Client / الزبون',
                'Téléphone / الهاتف',
                'Wilaya / الولاية',
                'Commune / البلدية',
                'Adresse / العنوان',
                'Type Livraison / نوع التوصيل',
                'Montant COD / المبلغ د.ج',
                'Statut Commande / حالة الطلب',
                'Code Suivi / رقم التتبع',
                'Transporteur / شركة التوصيل'
            ];
            const rows = ordersList.map(o => [
                o.orderId || o.id || '',
                (o.date || o.createdAt || '').slice(0, 19).replace('T', ' '),
                (o.fullName || '').replace(/"/g, '""'),
                (o.phone || '').replace(/"/g, '""'),
                (o.wilaya || o.wilayaName || '').replace(/"/g, '""'),
                (o.commune || '').replace(/"/g, '""'),
                (o.address || '').replace(/"/g, '""'),
                o.deliveryType === 'stopdesk' ? 'Stop Desk (مكتب)' : 'Domicile (منزل)',
                o.totalPrice || o.price || 0,
                o.status || 'pending',
                (o.trackingCode || o.redex_tracking_code || '').replace(/"/g, '""'),
                o.courier || 'redex'
            ]);
            const csvContent = '\\uFEFF' + [
                headers.map(h => \`"\${h}"\`).join(';'),
                ...rows.map(r => r.map(c => \`"\${c}"\`).join(';'))
            ].join('\\r\\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = \`SPEAR-DZ-Commandes-\${new Date().toISOString().slice(0, 10)}.csv\`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }`;

js = js.replace(exportRegex, newExport);

fs.writeFileSync(destPath, js, 'utf8');
console.log('Successfully generated public/js/admin-client.js. Bytes:', fs.statSync(destPath).size);


