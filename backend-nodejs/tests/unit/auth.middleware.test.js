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
	});
});
