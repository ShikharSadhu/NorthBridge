const authService = require('../../src/services/auth.service');

describe('auth.service', () => {
	test('listUsers returns success response', async () => {
		const result = await authService.listUsers();
		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(Array.isArray(result.data)).toBe(true);
	});

	test('login succeeds with authenticated firebase context payload', async () => {
		const result = await authService.login({
			userId: 'u_1001',
			authEmail: 'aarav@northbridge.app',
			authName: 'Aarav Sharma',
		});

		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.data).toHaveProperty('authProvider', 'firebase');
		expect(result.data).toHaveProperty('user');
		expect(result.data.user).toHaveProperty('id', 'u_1001');
	});

	test('login fails when firebase-authenticated context is missing', async () => {
		const result = await authService.login({
			email: 'aarav@northbridge.app',
		});

		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
	});

	test('getCurrentUser fails without userId', async () => {
		const result = await authService.getCurrentUser({});
		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
	});

	test('getCurrentUser returns private self shape when authenticated', async () => {
		const result = await authService.getCurrentUser({userId: 'u_1001'});
		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.data).toHaveProperty('email');
		expect(result.data).toHaveProperty('privatePaymentQrDataUrl');
	});
});
