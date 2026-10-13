'use strict';

require('dotenv').config({ path: '.env.local' });
const { sendOrderNotification } = require('./lib/telegram');

const token = (process.env.TELEGRAM_BOT_TOKEN || '8289426781:AAFrOPJRalFpKmbm3X_NnXP9G9yddWLfJwQ').trim();

async function main() {
    console.log('🤖 Checking Telegram Bot configuration for @speardzl3abed_bot...');

    // 1. Verify Bot Token
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
        console.error('❌ Invalid Telegram Bot Token:', meData.description);
        return;
    }
    console.log(`✅ Bot Connected: @${meData.result.username} (ID: ${meData.result.id})`);

    // 2. Fetch Updates to discover Channel / Chat ID
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const updatesData = await updatesRes.json();

    let detectedChatId = process.env.TELEGRAM_CHAT_ID;

    if (updatesData.ok && updatesData.result.length > 0) {
        for (const update of updatesData.result) {
            const chat = update.channel_post?.chat || update.message?.chat || update.my_chat_member?.chat;
            if (chat) {
                detectedChatId = chat.id;
                console.log(`📡 Detected Chat ID: ${chat.id} (${chat.title || chat.username || 'Private'})`);
            }
        }
    }

    if (!detectedChatId) {
        console.log('\n⚠️ No messages or channels detected yet!');
        console.log('👉 ACTION REQUIRED:');
        console.log('1. Go to your Telegram Channel: https://t.me/+Ks2UsMHWrJg0ODNk');
        console.log('2. Click Channel Info > Administrators > Add Administrator');
        console.log('3. Add @speardzl3abed_bot with "Post Messages" permission.');
        console.log('4. Post any message in the channel (e.g. "Salam").');
        console.log('5. Re-run this script: node test-telegram.js\n');
        return;
    }

    console.log(`\n🚀 Sending test order alert to Chat ID: ${detectedChatId}...`);
    process.env.TELEGRAM_CHAT_ID = String(detectedChatId);

    const testOrder = {
        orderId: 'SPDZ-TEST-' + Math.floor(1000 + Math.random() * 9000),
        fullName: 'اختبار الإشعارات (Notification Test)',
        customerPhone: '0555001122',
        wilayaName: 'Alger',
        commune: 'Bab Ezzouar',
        deliveryType: 'home',
        totalPrice: 21900,
        riskScore: 10,
        riskLevel: 'LOW'
    };

    const sendRes = await sendOrderNotification(testOrder, { score: 10, level: 'LOW' });
    if (sendRes.success) {
        console.log(`🎉 SUCCESS! Test notification sent to Telegram channel. Message ID: ${sendRes.messageId}`);
    } else {
        console.log(`❌ Failed to send message: ${sendRes.error}`);
    }
}

main().catch(console.error);
