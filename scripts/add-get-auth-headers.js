const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'js', 'admin-client.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = '        initAuthCheck: function () {';
const method = [
    '        getAuthHeaders: function () {',
    "            const token = sessionStorage.getItem('orva_admin_token') || localStorage.getItem('spdz_admin_token') || '';",
    "            const headers = { 'Content-Type': 'application/json' };",
    '            if (token) {',
    "                headers['Authorization'] = 'Bearer ' + token;",
    "                headers['X-Admin-Token'] = token;",
    '            }',
    '            return headers;',
    '        },',
    '',
    '        initAuthCheck: function () {'
].join('\n');

if (code.includes(target) && !code.includes('getAuthHeaders: function')) {
    code = code.replace(target, method);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✓ Successfully added getAuthHeaders: function');
} else {
    console.log('Already present or target not found');
}
