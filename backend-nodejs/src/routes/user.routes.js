const {listUsersController, getPublicUserByIdController} = require('../controllers/user.controller');

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
];

module.exports = {
	userRoutes,
};
