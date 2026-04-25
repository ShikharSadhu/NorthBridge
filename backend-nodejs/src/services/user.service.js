const {
	listPublicUsers,
	findUserByEmail,
	getPublicUserById: getPublicUserByIdFromRepository,
	getPrivateUserById: getPrivateUserByIdFromRepository,
	createUser,
	upsertUserFromAuth,
	updateUserProfile: updateUserProfileInRepository,
	submitRatingForUser: submitRatingForUserInRepository,
} = require('../repositories/user.repository');
const {
	validateCurrentUserPayload,
	validateLoginPayload,
	validateSignupPayload,
	validateUpdateProfilePayload,
} = require('../validators/auth.validator');
const {success, failure} = require('../utils/response.util');

function resolveAuthFailureMessage(payload = {}) {
	if (typeof payload.authErrorMessage === 'string' && payload.authErrorMessage.trim()) {
		return payload.authErrorMessage.trim();
	}

	switch (payload.authErrorCode) {
		case 'token_expired':
			return 'Authentication token has expired.';
		case 'token_revoked':
			return 'Authentication token was revoked.';
		case 'invalid_token':
		case 'token_verification_failed':
			return 'Authentication token is invalid.';
		case 'firebase_unavailable':
			return 'Authentication service is unavailable.';
		default:
			return 'User is not authenticated.';
	}
}

async function listUsers() {
	return success(200, await listPublicUsers());
}

async function getCurrentUser(payload = {}) {
	const validation = validateCurrentUserPayload(payload);
	if (!validation.valid) {
		return failure(401, resolveAuthFailureMessage(payload));
	}

	const user = await getPrivateUserByIdFromRepository(validation.value.userId);
	if (!user) {
		return failure(404, 'User not found.');
	}

	return success(200, user);
}

async function getPublicUserById(payload = {}) {
	const userId = typeof payload === 'string' ? payload : payload.userId;
	const user = await getPublicUserByIdFromRepository(userId);
	if (!user) {
		return failure(404, 'User not found.');
	}

	return success(200, user);
}

async function login(payload = {}) {
	const validation = validateLoginPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Email and password are required.');
	}

	const existingUser = await findUserByEmail(validation.value.email);
	if (!existingUser) {
		return failure(401, 'Invalid email or password.');
	}

	if (existingUser.password !== validation.value.password) {
		return failure(401, 'Invalid email or password.');
	}

	const privateUser = await getPrivateUserByIdFromRepository(existingUser.id);
	if (!privateUser) {
		return failure(404, 'User not found.');
	}

	return success(200, {user: privateUser, authProvider: 'local'});
}

async function signup(payload = {}) {
	const validation = validateSignupPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Name, location, email, and password are required.');
	}

	const existingUser = await findUserByEmail(validation.value.email);
	if (existingUser) {
		return failure(409, 'That email already has an account. Try logging in.');
	}

	const createdUser = await createUser(validation.value);
	const privateUser = await getPrivateUserByIdFromRepository(createdUser.id);
	if (!privateUser) {
		return failure(500, 'Failed to create user.');
	}

	return success(201, {user: privateUser, authProvider: 'local'});
}

async function updateUserProfile(payload = {}, authUserId = '') {
	const userId = typeof authUserId === 'string' ? authUserId.trim() : '';
	if (!userId) {
		return failure(401, resolveAuthFailureMessage(payload));
	}

	const validation = validateUpdateProfilePayload(payload);
	if (!validation.valid) {
		return failure(400, 'Invalid profile payload.');
	}

	const updatedUser = await updateUserProfileInRepository(userId, validation.value);
	if (!updatedUser) {
		return failure(404, 'User not found.');
	}

	return success(200, updatedUser);
}

async function submitRatingForUser(payload = {}) {
	const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
	const rating = payload.rating;

	if (!targetUserId) {
		return failure(400, 'targetUserId is required.');
	}
	if (typeof rating !== 'number' || Number.isNaN(rating) || rating < 1 || rating > 5) {
		return failure(400, 'rating must be a number between 1 and 5.');
	}

	const updatedUser = await submitRatingForUserInRepository(targetUserId, rating);
	if (!updatedUser) {
		return failure(404, 'User not found.');
	}

	return success(200, updatedUser);
}

function logout() {
	return success(204, null);
}

module.exports = {
	listUsers,
	getCurrentUser,
	getPublicUserById,
	login,
	signup,
	updateUserProfile,
	submitRatingForUser,
	logout,
};
