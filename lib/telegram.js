'use strict';

const https = require('https');

const DEFAULT_STORE_URL = 'https://speardz-store.vercel.app';

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Sends a formatted order notification to Telegram Channel / Chat.
 *
 * @param {Object} order - Order details
 * @param {Object} risk - Risk analysis result
 * @returns {Promise<Object>}
 */
async function sendOrderNotification(order, risk = {}) {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

    if (!token || !chatId) {
        return { success: false, skipped: true, reason: 'Telegram bot credentials not configured' };
    }

    const orderId = order.orderId || order.id || 'N/A';
    const fullName = order.fullName || order.customerName || 'عميل محترم';
    const phone = order.customerPhone || order.phone || 'N/A';
    const wilaya = order.wilayaName || order.wilaya || 'N/A';
    const commune = order.commune || '';
    const address = order.address || order.shippingAddress || (commune ? `${commune}، ${wilaya}` : 'توصيل عادي');
    const delivery = (order.deliveryType === 'desk' || order.deliveryType === 'stopdesk')
        ? 'مكتب التوصيل (Stopdesk)'
        : 'توصيل للمنزل (Domicile)';
    const quantity = order.quantity || 1;
    const total = Number(order.totalPrice || order.totalAmount || 20400);

    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    let formattedDate = '';
    try {
        formattedDate = new Intl.DateTimeFormat('fr-DZ', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: process.env.STORE_TIMEZONE || 'Africa/Algiers'
        }).format(orderDate);
    } catch {
        formattedDate = orderDate.toLocaleString('fr-DZ');
    }

    const storeUrl = (process.env.STORE_URL || DEFAULT_STORE_URL).trim().replace(/\/+$/, '');
    const adminUrl = `${storeUrl}/admin`;

    const text =
        `🛍️ <b>طلب جديد</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>\n` +
        `👤 <b>الاسم:</b> ${escapeHtml(fullName)}\n` +
        `📞 <b>الهاتف:</b> <code>${phone}</code>\n` +
        `📍 <b>الولاية:</b> ${escapeHtml(wilaya)}\n` +
        `🏛️ <b>البلدية:</b> ${escapeHtml(commune || 'غير محدد')}\n` +
        `🏠 <b>العنوان:</b> ${escapeHtml(address)}\n` +
        `🚚 <b>التوصيل:</b> ${delivery}\n` +
        `📦 <b>الكمية:</b> ${quantity}\n` +
        `💰 <b>الإجمالي:</b> <b>${total.toLocaleString('fr-DZ')} د.ج</b>\n` +
        `📅 <b>التاريخ:</b> ${formattedDate}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📊 <b>لوحة التحكم والتعديل Admin Dashboard</b>\n` +
        `🔗 <a href="${adminUrl}">Tableau de bord</a>`;

    const payload = JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
    });

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${encodeURIComponent(token)}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve({ success: true, messageId: parsed.result.message_id });
                    } else {
                        console.warn('[Telegram] API error:', parsed.description);
                        resolve({ success: false, error: parsed.description });
                    }
                } catch (e) {
                    resolve({ success: false, error: e.message });
                }
            });
        });

        req.on('error', (err) => {
            console.warn('[Telegram] Network error:', err.message);
            resolve({ success: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Telegram request timed out' });
        });

        req.write(payload);
        req.end();
    });
}

module.exports = {
    sendOrderNotification
};
