const http = require('http');
const {createAppHandler} = require('../src/app');

function requestJson({port, method, path, headers, body}) {
	return new Promise((resolve, reject) => {
		const payload = body == null ? null : JSON.stringify(body);
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port,
				method,
				path,
				headers: {
					'Content-Type': 'application/json',
					...(payload ? {'Content-Length': Buffer.byteLength(payload)} : {}),
					...(headers || {}),
				},
			},
			(res) => {
				let raw = '';
				res.on('data', (chunk) => {
					raw += chunk;
				});
				res.on('end', () => {
					let parsed = {};
					try {
						parsed = raw ? JSON.parse(raw) : {};
					} catch (_error) {
						parsed = {};
					}
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: parsed,
					});
				});
			},
		);

		req.on('error', reject);
		if (payload) {
			req.write(payload);
		}
		req.end();
	});
}

describe('app request id propagation', () => {
	let server;
	let port;

	beforeEach(async () => {
		server = http.createServer(createAppHandler());
		await new Promise((resolve) => {
			server.listen(0, '127.0.0.1', resolve);
		});
		const address = server.address();
		port = address && typeof address === 'object' ? address.port : null;
	});

	afterEach(async () => {
		if (!server) {
			return;
		}
		await new Promise((resolve) => server.close(resolve));
		server = null;
	});

	test('adds generated request id to response header and JSON body', async () => {
		const response = await requestJson({
			port,
			method: 'GET',
			path: '/v1/health',
		});

		expect(response.statusCode).toBe(200);
		expect(typeof response.headers['x-request-id']).toBe('string');
		expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
		expect(response.body).toHaveProperty('requestId', response.headers['x-request-id']);
	});

	test('reuses incoming x-request-id value', async () => {
		const response = await requestJson({
			port,
			method: 'GET',
			path: '/v1/health',
			headers: {'x-request-id': 'req-integration-123'},
		});

		expect(response.statusCode).toBe(200);
		expect(response.headers['x-request-id']).toBe('req-integration-123');
		expect(response.body).toHaveProperty('requestId', 'req-integration-123');
	});
});
