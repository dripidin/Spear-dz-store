'use strict';
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'reference-yamahasac', 'admin.html');
const destPath = path.join(__dirname, '..', 'admin.html');

let html = fs.readFileSync(srcPath, 'utf8');

// Title
html = html.replace(/<title>.*?<\/title>/, '<title>SPEAR.DZ • لوحة التحكم اللوجستية والإدارة المركزية</title>');

// CSS Link
html = html.replace(/href="admin\.css"/g, 'href="/css/admin.css"');

// Brand Names
html = html.replace(/ORVA STORE/g, 'SPEAR.DZ');
html = html.replace(/ORVA<span class="brand-highlight">STORE<\/span>/g, 'SPEAR<span class="brand-highlight">.DZ</span>');
html = html.replace(/<i class="fa-solid fa-store"><\/i>/g, '<i class="fa-solid fa-bolt"></i>');

// Courier Name
html = html.replace(/<span id="navCourierName">Ecotrack DZ<\/span>/g, '<span id="navCourierName">Yalidine / Redex</span>');
html = html.replace(/<strong id="mobileNavCourierName">Ecotrack DZ<\/strong>/g, '<strong id="mobileNavCourierName">Yalidine / Redex</strong>');

// DB Sync Pill
html = html.replace(/Excel & Sheets: <strong data-i18n="statusSync">Synchronisé<\/strong>/g, 'Supabase: <strong data-i18n="statusSync">Synchronisé ✅</strong>');

// Admin Profile
html = html.replace(/Admin ORVA/g, 'Admin SPEAR-DZ');
html = html.replace(/ORVA Store DZ/g, 'SPEAR-DZ Enterprise');
html = html.replace(/Yamaha Sac Pro • COD/g, 'PACK HIGH-TECH 5 EN 1');

// Description
html = html.replace(/Google Sheets et Facebook Meta CAPI/g, 'Supabase PostgreSQL et Telegram Bot');
html = html.replace(/Google Cloud Sheets API \+ Base Locale Excel \(\.xlsx\) Synchronisés/g, 'Supabase PostgreSQL Cloud Database + Sauvegarde Locale');

// Default price & product in modals
html = html.replace(/value="4400"/g, 'value="21900"');
html = html.replace(/Sac Banane Moto Yamaha \(كرطابل يماها\)/g, 'PACK HIGH-TECH 5 EN 1 (Smartwatch + Écouteurs ANC + Powerbank + Câble + Chargeur 65W)');

// Quick Store Navigation
const quickNavRegex = /<div class="store-quick-nav">[\s\S]*?<\/div>/;
const newQuickNav = `<div class="store-quick-nav">
                <a href="/" target="_blank" class="store-nav-pill" title="زيارة المتجر الرئيسي">
                    <i class="fa-solid fa-house"></i> <span>المتجر الرئيسي</span>
                </a>
                <a href="/#orderForm" target="_blank" class="store-nav-pill" title="استمارة الطلب">
                    <i class="fa-solid fa-bag-shopping"></i> <span>طلب العرض (21,900 دج)</span>
                </a>
                <a href="#orders" class="store-nav-pill" onclick="storeAdmin.switchTab('orders')" title="إدارة الطلبيات">
                    <i class="fa-solid fa-boxes-packing"></i> <span>سجل الطلبيات</span>
                </a>
            </div>`;
html = html.replace(quickNavRegex, newQuickNav);

// Scripts links
html = html.replace(/<script src="algeria-communes\.js"><\/script>/, '<script src="/js/algeria-communes.js"></script>');
html = html.replace(/<script src="admin\.js"><\/script>/, '<script src="/js/admin-client.js"></script>');

fs.writeFileSync(destPath, html, 'utf8');
console.log('Successfully generated admin.html. Bytes:', fs.statSync(destPath).size);
