const authService = require('../../src/services/auth.service');

describe('auth.service', () => {
	test('listUsers returns success response', async () => {
		const result = await authService.listUsers();
		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(Array.isArray(result.data)).toBe(true);
	});

	test('signup creates a user without requiring prior authentication', async () => {
		const email = `signup-${Date.now()}@northbridge.app`;
		const result = await authService.signup({
			name: 'Aarav Sharma',
			location: 'Delhi',
			email,
			password: 'pass123',
		});

		expect(result.ok).toBe(true);
		expect(result.status).toBe(201);
		expect(result.data).toHaveProperty('authProvider', 'local');
		expect(result.data).toHaveProperty('user');
		expect(result.data.user).toHaveProperty('email', email);
	});

	test('login succeeds with matching email and password', async () => {
		const email = `login-${Date.now()}@northbridge.app`;
		await authService.signup({
			name: 'Aarav Sharma',
			location: 'Delhi',
			email,
			password: 'pass123',
		});

		const result = await authService.login({
			email,
			password: 'pass123',
		});

		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.data).toHaveProperty('authProvider', 'local');
		expect(result.data).toHaveProperty('user');
		expect(result.data.user).toHaveProperty('email', email);
	});

	test('login fails when email or password is wrong', async () => {
		const email = `wrong-pass-${Date.now()}@northbridge.app`;
		await authService.signup({
			name: 'Aarav Sharma',
			location: 'Delhi',
			email,
			password: 'pass123',
		});

		const result = await authService.login({
			email,
			password: 'not-the-password',
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
