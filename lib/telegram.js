'use strict';

const https = require('https');

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
        return { success: false, skipped: true, reason: 'Telegram bot credentials not fully configured' };
    }

    const orderId = order.orderId || order.id || 'N/A';
    const fullName = order.fullName || order.customerName || 'عميل محترم';
    const phone = order.customerPhone || order.phone || 'N/A';
    const wilaya = order.wilayaName || order.wilaya || 'N/A';
    const commune = order.commune || '';
    const delivery = order.deliveryType === 'desk' || order.deliveryType === 'stopdesk' ? 'مكتب التوصيل (Stopdesk)' : 'توصيل للمنزل (Domicile)';
    const total = Number(order.totalPrice || order.totalAmount || 21900);
    const riskScore = risk.score ?? (order.riskScore ?? 0);
    const riskLevel = risk.level || (riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW');
    const storeUrl = process.env.STORE_URL || 'https://spear-dz.vercel.app';

    const text =
        `⚡ <b>طلب جديد في SPEAR-DZ!</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>رقم الطلب:</b> <code>${orderId}</code>\n` +
        `👤 <b>الزبون:</b> ${fullName}\n` +
        `📱 <b>الهاتف:</b> <code>${phone}</code>\n` +
        `📍 <b>الوجهة:</b> ${wilaya}${commune ? ' — ' + commune : ''}\n` +
        `🚚 <b>طريقة التوصيل:</b> ${delivery}\n` +
        `📦 <b>المنتج:</b> PACK HIGH-TECH 5 EN 1\n` +
        `💰 <b>المبلغ الإجمالي (COD):</b> <b>${total.toLocaleString('fr-DZ')} د.ج</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🛡️ <b>درع الأمان:</b> ${riskScore}/100 (${riskLevel})\n` +
        `🔗 <a href="${storeUrl}/admin">فتح لوحة التحكم الإدارية</a>`;

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
            timeout: 8000
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
