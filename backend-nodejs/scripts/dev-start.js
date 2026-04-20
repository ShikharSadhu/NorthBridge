const http = require('http');
const net = require('net');

const {startServer} = require('../src/server');

function resolvePort() {
	const parsed = Number(process.env.PORT);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
}

function isPortOpen(port) {
	return new Promise((resolve) => {
		const socket = new net.Socket();
		let settled = false;

		const done = (value) => {
			if (settled) {
				return;
			}
			settled = true;
			socket.destroy();
			resolve(value);
		};

		socket.setTimeout(700);
		socket.once('connect', () => done(true));
		socket.once('timeout', () => done(false));
		socket.once('error', () => done(false));
		socket.connect(port, '127.0.0.1');
	});
}

function isNorthBridgeHealthOk(port) {
	return new Promise((resolve) => {
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port,
				path: '/v1/health',
				method: 'GET',
				timeout: 1000,
			},
			(res) => {
				let raw = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					raw += chunk;
				});
				res.on('end', () => {
					if (res.statusCode !== 200) {
						resolve(false);
						return;
					}

					try {
						const parsed = JSON.parse(raw);
						resolve(parsed && parsed.status === 'ok');
					} catch (_error) {
						resolve(false);
					}
				});
			},
		);

		req.on('error', () => resolve(false));
		req.on('timeout', () => {
			req.destroy();
			resolve(false);
		});
		req.end();
	});
}

async function run() {
	const port = resolvePort();
	const alreadyInUse = await isPortOpen(port);

	if (alreadyInUse) {
		const backendAlive = await isNorthBridgeHealthOk(port);
		if (backendAlive) {
			process.stdout.write(
				`NorthBridge backend is already running on http://localhost:${port}\n`,
			);
			process.stdout.write(
				`Health: http://localhost:${port}/v1/health\n`,
			);
			return;
		}

		process.stderr.write(
			`Port ${port} is already in use by another process. Set PORT to a different value, for example: PORT=3001 npm run dev\n`,
		);
		process.exitCode = 1;
		return;
	}

	const {host} = await startServer({port});
	process.stdout.write(
		`NorthBridge backend listening on http://${host}:${port}\n`,
	);
}

run().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`Failed to start dev server: ${message}\n`);
	process.exitCode = 1;
});
