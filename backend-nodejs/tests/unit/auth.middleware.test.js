describe('auth.middleware contract', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	test('extractBearerToken reads bearer tokens from headers or request-like input', () => {
		const auth = require('../../src/middlewares/auth.middleware');

		expect(auth.extractBearerToken({authorization: 'Bearer token-123'})).toBe('token-123');
		expect(auth.extractBearerToken({headers: {Authorization: 'Bearer token-456'}})).toBe('token-456');
		expect(auth.extractBearerToken({authorization: 'Basic token-123'})).toBeUndefined();
	});

	test('extractFirebaseAuthContext does not trust x-user-id without a bearer token', async () => {
		const originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		const auth = require('../../src/middlewares/auth.middleware');

		const context = await auth.extractFirebaseAuthContext({
			headers: {
				'x-user-id': 'u_override',
			},
		});

		expect(context).toEqual({
			userId: undefined,
			email: undefined,
			name: undefined,
			tokenProvided: false,
			authErrorCode: undefined,
			authErrorMessage: undefined,
		});
		if (typeof originalNodeEnv === 'undefined') {
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = originalNodeEnv;
		}
	});

	test('extractFirebaseAuthContext supports explicit local override', async () => {
		const originalOverride = process.env.ALLOW_HTTP_AUTH_OVERRIDE;
		process.env.ALLOW_HTTP_AUTH_OVERRIDE = 'true';
		const auth = require('../../src/middlewares/auth.middleware');

		const context = await auth.extractFirebaseAuthContext({
			headers: {
				'x-user-id': 'u_local',
				'x-user-email': 'local@example.com',
				'x-user-name': 'Local User',
			},
		});

		expect(context).toMatchObject({
			userId: 'u_local',
			email: 'local@example.com',
			name: 'Local User',
			tokenProvided: false,
		});
		if (typeof originalOverride === 'undefined') {
			delete process.env.ALLOW_HTTP_AUTH_OVERRIDE;
		} else {
			process.env.ALLOW_HTTP_AUTH_OVERRIDE = originalOverride;
		}
	});
});
