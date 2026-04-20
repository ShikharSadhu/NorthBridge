const {
	listUsersController,
	getPublicUserByIdController,
	submitUserRatingController,
} = require('../controllers/user.controller');

const userRoutes = [
	{
		method: 'GET',
		path: '/v1/users',
		execute: () => listUsersController(),
	},
	{
		method: 'GET',
		path: '/v1/users/:userId',
		execute: (params) => getPublicUserByIdController(params.userId),
	},
	{
		method: 'POST',
		path: '/v1/users/:userId/rating',
		execute: (params, body) =>
			submitUserRatingController(params.userId, {
				rating: typeof body.rating === 'number' ? body.rating : undefined,
			}),
	},
];

module.exports = {
	userRoutes,
};
