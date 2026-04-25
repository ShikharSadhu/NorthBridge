// Simple WebSocket client for local development and testing
// Usage:
//   node ws-client.js ws://localhost:3000 <idToken>
// Or with override (if server started with ALLOW_WS_AUTH_OVERRIDE=true):
//   node ws-client.js ws://localhost:3000 <userId> --override

const WebSocket = require('ws');

const argv = process.argv.slice(2);
if (argv.length < 2) {
    console.error('Usage: node ws-client.js <wsUrl> <token|userId> [--override]');
    process.exit(2);
}

const wsUrl = argv[0].replace(/\/$/, '');
const tokenOrUser = argv[1];
const override = argv.includes('--override');

let connectUrl;
if (override) {
    connectUrl = `${wsUrl}/?x-user-id=${encodeURIComponent(tokenOrUser)}`;
} else {
    connectUrl = `${wsUrl}/?token=${encodeURIComponent(tokenOrUser)}`;
}

console.log('Connecting to', connectUrl);

const ws = new WebSocket(connectUrl);

ws.on('open', () => {
    console.log('Connected');
    // send a ping message every 10s to keep alive for demo
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
    }, 10000);
});

ws.on('message', (msg) => {
    console.log('<<', msg.toString());
});

ws.on('close', () => console.log('Closed'));
ws.on('error', (err) => console.error('Error', err && err.message));
