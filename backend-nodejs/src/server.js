const http = require('http');
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
const WebSocket = require('ws');
const websocketService = require('./services/websocket.service');
const admin = require('firebase-admin');
const authMiddleware = require('./middlewares/auth.middleware');
const initializeFirebaseAuth =
	authMiddleware && typeof authMiddleware.initializeFirebaseAuth === 'function'
		? authMiddleware.initializeFirebaseAuth
		: () => {
			  if (!admin.apps.length) {
				  try {
					  admin.initializeApp({
  						credential: admin.credential.cert(serviceAccount),
						});
					  return true;
				  } catch (_e) {
					  return false;
				  }
			  }
			  return true;
		  };
const { createAppHandler } = require('./app');
const { envConfig } = require('./config/env');

// 🔥 Initialize Firebase Admin (use middleware initializer for consistent config)
const _firebaseInitOk = initializeFirebaseAuth();
if (!_firebaseInitOk) {
	console.warn('Firebase admin failed to initialize. WebSocket auth may be unavailable.');
}

// WebSocket utilities (exported)
// websocketService will be registered with the created WebSocket.Server below

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
	// ✅ CORS HEADERS (REQUIRED FOR NETLIFY → RENDER)
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	Promise.resolve(appHandler(req, res)).catch(() => {
		res.statusCode = 500;
		res.setHeader('Content-Type', 'application/json; charset=utf-8');
		res.end(JSON.stringify({ message: 'Internal server error.' }));
	});
	});

	// 🔌 =========================
	// 🔌 WEBSOCKET SETUP (SECURE + STABLE)
	// 🔌 =========================
	const wss = new WebSocket.Server({ server });

	wss.on('connection', async (ws, req) => {
		try {
			const url = new URL(req.url, 'http://localhost');
			const token = url.searchParams.get('token');

			let userId;
			const wsAuthAvailable = Boolean(_firebaseInitOk);

			if (token) {
				if (wsAuthAvailable) {
					// Prefer centralized verifier from auth.middleware
					try {
						const decoded = await authMiddleware.verifyIdToken(token);
						userId = decoded.uid;
					} catch (err) {
						console.log('❌ Invalid token:', err.message || err);
						ws.close();
						return;
					}
				} else {
					if (process.env.ALLOW_WS_AUTH_OVERRIDE !== 'true') {
						console.log('❌ Firebase unavailable for token verification');
						ws.close();
						return;
					}

					userId = token;
					console.log('⚠️ WS token override used while Firebase is unavailable:', userId);
				}
			} else {
				const override = url.searchParams.get('x-user-id');
				if (override) {
					userId = override;
					console.log('🔌 WS auth override used for user:', userId);
				} else {
					console.log('❌ Missing token');
					ws.close();
					return;
				}
			}

			ws.userId = userId;

			// 🔥 HEARTBEAT INIT
			ws.isAlive = true;
			ws.on('pong', () => {
				ws.isAlive = true;
			});

			console.log(`🔌 Connected: ${userId}`);

			// Optional: confirm connection
			ws.send(
				JSON.stringify({
					type: 'CONNECTED',
					data: { userId },
				})
			);

			ws.on('message', (message) => {
				console.log(`📩 ${userId}:`, message.toString());
			});

			ws.on('close', () => {
				console.log(`❌ Disconnected: ${userId}`);
			});
		} catch (err) {
			console.log('❌ WS connection error:', err.message || err);
			ws.close();
		}
	});

	// 🔥 HEARTBEAT LOOP (kill dead clients)
	const heartbeatInterval = setInterval(() => {
		wss.clients.forEach((ws) => {
			if (ws.isAlive === false) {
				console.log(`💀 Terminating: ${ws.userId}`);
				return ws.terminate();
			}

			ws.isAlive = false;
			ws.ping();
		});
	}, 30000);

	wss.on('close', () => {
		clearInterval(heartbeatInterval);
	});

	// Register WSS with websocketService for broadcast/sendToUser
	websocketService.setServer(wss);

	// 🔌 =========================

	function stop() {
		clearInterval(heartbeatInterval);
		websocketService.setServer(null);
		for (const client of wss.clients) {
			client.terminate();
		}

		return new Promise((resolve, reject) => {
			wss.close((wssError) => {
				server.close((serverError) => {
					const error = wssError || serverError;
					if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
						reject(error);
						return;
					}

					resolve();
				});
			});
		});
	}

	return new Promise((resolve) => {
		server.listen(port, host, () => {
			const address = server.address();
			const actualPort = address && typeof address === 'object' ? address.port : port;
			resolve({ server, wss, port: actualPort, host, stop });
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
};
