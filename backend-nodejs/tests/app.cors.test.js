const http = require('http');
const {createAppHandler} = require('../src/app');

function request({port, method, path, headers}) {
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port,
				method,
				path,
				headers: headers || {},
			},
			(res) => {
				let raw = '';
				res.on('data', (chunk) => {
					raw += chunk;
				});
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: raw,
					});
				});
			},
		);

		req.on('error', reject);
		req.end();
	});
}

describe('app cors headers', () => {
	let originalCorsOrigins;
	let server;
	let port;

	beforeEach(async () => {
		originalCorsOrigins = process.env.CORS_ORIGINS;
		process.env.CORS_ORIGINS = 'http://localhost:5173';

		jest.resetModules();
		server = http.createServer(createAppHandler());
		await new Promise((resolve) => {
			server.listen(0, '127.0.0.1', resolve);
		});
		const address = server.address();
		port = address && typeof address === 'object' ? address.port : null;
	});

	afterEach(async () => {
		if (originalCorsOrigins === undefined) {
			delete process.env.CORS_ORIGINS;
		} else {
			process.env.CORS_ORIGINS = originalCorsOrigins;
		}

		if (!server) {
			return;
		}

		await new Promise((resolve) => server.close(resolve));
		server = null;
	});

	test('preflight allows auth override headers used by browser fallback auth', async () => {
		const response = await request({
			port,
			method: 'OPTIONS',
			path: '/v1/auth/signup',
			headers: {
				origin: 'http://localhost:5173',
				'access-control-request-method': 'POST',
				'access-control-request-headers': 'content-type,x-user-id,x-user-email,x-user-name',
			},
		});

		expect(response.statusCode).toBe(204);
		expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
		expect(response.headers['access-control-allow-headers']).toContain('X-User-Id');
		expect(response.headers['access-control-allow-headers']).toContain('X-User-Email');
		expect(response.headers['access-control-allow-headers']).toContain('X-User-Name');
	});
});
