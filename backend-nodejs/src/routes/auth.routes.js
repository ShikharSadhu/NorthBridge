const {
	getCurrentUserController,
	loginController,
	logoutController,
	signupController,
	updateUserProfileController,
} = require('../controllers/auth.controller');

const authRoutes = [
	{
		method: 'GET',
		path: '/v1/auth/me',
		execute: (_params, body, userId) =>
			getCurrentUserController({
				userId: typeof userId === 'string' && userId.trim() ? userId : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/auth/login',
		execute: (_params, body, userId) =>
			loginController({
				userId: typeof userId === 'string' ? userId : undefined,
				authEmail: typeof body.authEmail === 'string' ? body.authEmail : undefined,
				authName: typeof body.authName === 'string' ? body.authName : undefined,
				email: typeof body.email === 'string' ? body.email : undefined,
				password: typeof body.password === 'string' ? body.password : undefined,
				name: typeof body.name === 'string' ? body.name : undefined,
				location: typeof body.location === 'string' ? body.location : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/auth/signup',
		execute: (_params, body, userId) =>
			signupController({
				userId: typeof userId === 'string' ? userId : undefined,
				authEmail: typeof body.authEmail === 'string' ? body.authEmail : undefined,
				authName: typeof body.authName === 'string' ? body.authName : undefined,
				email: typeof body.email === 'string' ? body.email : undefined,
				password: typeof body.password === 'string' ? body.password : undefined,
				name: typeof body.name === 'string' ? body.name : undefined,
				location: typeof body.location === 'string' ? body.location : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/auth/logout',
		execute: () => logoutController(),
	},
	{
		method: 'PATCH',
		path: '/v1/auth/me/profile',
		execute: (_params, body, userId) =>
			updateUserProfileController(
				{
					name: typeof body.name === 'string' ? body.name : undefined,
					bio: typeof body.bio === 'string' ? body.bio : undefined,
					location: typeof body.location === 'string' ? body.location : undefined,
					phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber : undefined,
					email: typeof body.email === 'string' ? body.email : undefined,
					skills: Array.isArray(body.skills) ? body.skills : undefined,
					profileImageUrl:
						typeof body.profileImageUrl === 'string' ? body.profileImageUrl : undefined,
					privatePaymentQrDataUrl:
						typeof body.privatePaymentQrDataUrl === 'string'
							? body.privatePaymentQrDataUrl
							: undefined,
				},
				userId,
			),
	},
];

module.exports = {
	authRoutes,
};
