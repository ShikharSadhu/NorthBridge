const {createFirebaseAdminConfig, hasFirestoreConnection} = require('../config/firebase');

const healthRoutes = [
	{
		method: 'GET',
		path: '/v1/health',
		execute: () => ({
			status: 200,
			body: {
				status: 'ok',
				firestore: {
					configured: createFirebaseAdminConfig().configured,
					connected: hasFirestoreConnection(),
				},
			},
		}),
	},
];

module.exports = {
	healthRoutes,
};
