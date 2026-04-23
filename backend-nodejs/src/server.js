const http = require('http');
const WebSocket = require('ws');
const { createAppHandler } = require('./app');
const { envConfig } = require('./config/env');

// WebSocket utilities (exported)
let websocketUtils = {
	broadcast: () => {},
	sendToUser: () => {},
};

function startServer(options = {}) {
	const port = Number.isFinite(options.port) ? options.port : envConfig.port;
	const host =
		typeof options.host === 'string' && options.host.trim()
			? options.host
			: '0.0.0.0';

	const appHandler =
		typeof options.handler === 'function'
			? options.handler
			: createAppHandler();

	const server = http.createServer((req, res) => {
		Promise.resolve(appHandler(req, res)).catch(() => {
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			res.end(JSON.stringify({ message: 'Internal server error.' }));
		});
	});

	// 🔌 =========================
	// 🔌 WEBSOCKET SETUP
	// 🔌 =========================
	const wss = new WebSocket.Server({ server });

	wss.on('connection', (ws, req) => {
		const url = new URL(req.url, 'http://localhost');
		const userId = url.searchParams.get('userId');

		// Reject if no userId
		if (!userId) {
			console.log('❌ Missing userId, closing connection');
			ws.close();
			return;
		}

		ws.userId = userId;

		console.log(`🔌 WebSocket connected: userId=${userId}`);

		ws.on('message', (message) => {
			console.log(`📩 Message from ${userId}:`, message.toString());
		});

		ws.on('close', () => {
			console.log(`❌ Client disconnected: userId=${userId}`);
		});
	});

	// Send to ALL clients
	websocketUtils.broadcast = function (data) {
		const message = JSON.stringify(data);

		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	};

	// Send to ONE specific user
	websocketUtils.sendToUser = function (userId, data) {
		const message = JSON.stringify(data);

		wss.clients.forEach((client) => {
			if (
				client.readyState === WebSocket.OPEN &&
				client.userId === userId
			) {
				client.send(message);
			}
		});
	};

	// 🔌 =========================

	return new Promise((resolve) => {
		server.listen(port, host, () => {
			resolve({ server, port, host });
		});
	});
}

if (require.main === module) {
	startServer().then(({ port, host }) => {
		process.stdout.write(
			`NorthBridge backend listening on http://${host}:${port}\n`
		);
	});
}

module.exports = {
	startServer,
	websocketUtils, // EXPORT THIS
};