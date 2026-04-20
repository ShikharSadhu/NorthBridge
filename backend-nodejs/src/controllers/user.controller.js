const userService = require('../services/user.service');

function toEntityBody(result, entityKey) {
	if (!result.ok) {
		return {
			[entityKey]: null,
			message: result.message,
		};
	}

	return {
		[entityKey]: result.data,
	};
}

async function listUsersController() {
	const result = await userService.listUsers();
	return {
		status: result.status,
		body: {
			users: result.data,
		},
	};
}

async function getPublicUserByIdController(userId) {
	const result = await userService.getPublicUserById({userId});
	return {
		status: result.status,
		body: toEntityBody(result, 'user'),
	};
}

async function getCurrentUserController(payload = {}) {
	const result = await userService.getCurrentUser(payload);
	return {
		status: result.status,
		body: toEntityBody(result, 'user'),
	};
}

async function loginController(payload = {}) {
	const result = await userService.login(payload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				user: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: result.data,
	};
}

async function signupController(payload = {}) {
	const result = await userService.signup(payload);
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				user: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: result.data,
	};
}

async function updateUserProfileController(payload = {}, authUserId = '') {
	const result = await userService.updateUserProfile ? await userService.updateUserProfile(payload, authUserId) : {ok: false, status: 501, message: 'Not implemented'};
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				user: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			user: result.data,
		},
	};
}

async function submitUserRatingController(userId, payload = {}) {
	const result = await userService.submitRatingForUser({
		targetUserId: userId,
		rating: payload.rating,
	});
	if (!result.ok) {
		return {
			status: result.status,
			body: {
				user: null,
				message: result.message,
			},
		};
	}

	return {
		status: result.status,
		body: {
			user: result.data,
		},
	};
}

async function logoutController() {
	const result = await userService.logout();
	return {
		status: result.status,
		body: null,
	};
}

module.exports = {
	listUsersController,
	getPublicUserByIdController,
	getCurrentUserController,
	loginController,
	signupController,
	updateUserProfileController,
	submitUserRatingController,
	logoutController,
};