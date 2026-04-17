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
		execute: (_params, body) =>
			getCurrentUserController({
				userId: typeof body.userId === 'string' ? body.userId : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/auth/login',
		execute: (_params, body) =>
			loginController({
				email: typeof body.email === 'string' ? body.email : undefined,
				password: typeof body.password === 'string' ? body.password : undefined,
			}),
	},
	{
		method: 'POST',
		path: '/v1/auth/signup',
		execute: (_params, body) =>
			signupController({
				name: typeof body.name === 'string' ? body.name : undefined,
				location: typeof body.location === 'string' ? body.location : undefined,
				email: typeof body.email === 'string' ? body.email : undefined,
				password: typeof body.password === 'string' ? body.password : undefined,
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
					location: typeof body.location === 'string' ? body.location : undefined,
					email: typeof body.email === 'string' ? body.email : undefined,
					// Currently backend supports name, location, email; other fields ready for expansion
				},
				userId,
			),
	},
];

module.exports = {
	authRoutes,
};
