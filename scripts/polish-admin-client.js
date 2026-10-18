const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. WhatsApp text
code = code.replace(
    'نتصل بك من متجر ORVA Store',
    'نتصل بك من متجر SPEAR-DZ'
);

// 2. Order ID fallback and product name fallback
code = code.replace(
    "orderId: orderId || ('ORVA-' + Math.floor(10000 + Math.random() * 90000)),",
    "orderId: orderId || ('SPDZ-' + Math.floor(10000 + Math.random() * 90000)),"
);

code = code.replace(
    "resolvedPName = 'PACK 5EN1 13390';",
    "resolvedPName = 'PACK HIGH-TECH 5 EN 1 SPEAR-DZ';"
);

// 3. Shipping label fallbacks
code = code.replace(
    "lblClientNameText.textContent = o.fullName || 'Client ORVA';",
    "lblClientNameText.textContent = o.fullName || 'Client SPEAR-DZ';"
);

code = code.replace(
    "o.grandTotal || (o.priceNum ? (o.priceNum + ' DZD') : '4,900 DZD');",
    "o.grandTotal || (o.priceNum ? (o.priceNum + ' DZD') : '20,400 DZD');"
);

code = code.replace(
    "lblProductNote.textContent = `📦 Contenu: ${o.productName || 'Sac Banane Moto Yamaha (كرطابل يماها)'}`;",
    "lblProductNote.textContent = `📦 Contenu: ${o.productName || 'PACK HIGH-TECH 5 EN 1 SPEAR-DZ'}`;"
);

// 4. Risk override header
code = code.replace(
    "headers: {\n                        'Content-Type': 'application/json',\n                        'Authorization': 'Bearer orva-admin-2026-secure'\n                    },",
    "headers: this.getAuthHeaders(),"
);

// 5. Standardize storage keys (support spdz_carrier_* with orva_carrier_* fallback)
code = code.replace(
    "return localStorage.getItem('orva_carrier_token') || '';",
    "return localStorage.getItem('spdz_carrier_token') || localStorage.getItem('orva_carrier_token') || '';"
);
code = code.replace(
    "return localStorage.getItem('orva_carrier_base_url') || 'https://redex.ecotrack.dz';",
    "return localStorage.getItem('spdz_carrier_base_url') || localStorage.getItem('orva_carrier_base_url') || 'https://redex.ecotrack.dz';"
);
code = code.replace(
    "localStorage.setItem('orva_carrier_token', tokenInput.value.trim());",
    "localStorage.setItem('spdz_carrier_token', tokenInput.value.trim());\n                localStorage.setItem('orva_carrier_token', tokenInput.value.trim());"
);
code = code.replace(
    "localStorage.setItem('orva_carrier_base_url', urlInput.value.trim() || 'https://redex.ecotrack.dz');",
    "localStorage.setItem('spdz_carrier_base_url', urlInput.value.trim() || 'https://redex.ecotrack.dz');\n                localStorage.setItem('orva_carrier_base_url', urlInput.value.trim() || 'https://redex.ecotrack.dz');"
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✓ Successfully polished public/js/admin-client.js branding and fallbacks');
