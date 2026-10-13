const { spawn } = require('child_process');
const http = require('http');

async function testCdp() {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const chromeProc = spawn(chromePath, [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--disable-gpu',
        '--no-sandbox',
        '--user-data-dir=C:\\Users\\MICRO\\AppData\\Local\\Temp\\chrome_cdp_profile'
    ]);

    // Wait for Chrome port
    let targets = null;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 250));
        try {
            targets = await new Promise((resolve, reject) => {
                http.get('http://127.0.0.1:9222/json', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(JSON.parse(data)));
                }).on('error', reject);
            });
            if (targets) break;
        } catch (e) {}
    }

    console.log('Targets:', targets ? targets.length : 0);
    if (targets && targets[0]) {
        console.log('Target WS URL:', targets[0].webSocketDebuggerUrl);
    }

    chromeProc.kill();
}

testCdp().catch(console.error);
