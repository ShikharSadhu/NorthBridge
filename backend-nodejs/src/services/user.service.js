const {
	listPublicUsers,
	getPublicUserById: getPublicUserByIdFromRepository,
	getPrivateUserById: getPrivateUserByIdFromRepository,
	upsertUserFromAuth,
	updateUserProfile: updateUserProfileInRepository,
	submitRatingForUser: submitRatingForUserInRepository,
} = require('../repositories/user.repository');
const {
	validateCurrentUserPayload,
	validateFirebaseAuthPayload,
	validateUpdateProfilePayload,
} = require('../validators/auth.validator');
const {success, failure} = require('../utils/response.util');

async function listUsers() {
	return success(200, await listPublicUsers());
}

async function getCurrentUser(payload = {}) {
	const validation = validateCurrentUserPayload(payload);
	if (!validation.valid) {
		return failure(401, 'User is not authenticated.');
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
	const validation = validateFirebaseAuthPayload(payload);
	if (!validation.valid) {
		return failure(401, 'User is not authenticated.');
	}

	const upserted = await upsertUserFromAuth(validation.value);
	if (!upserted.user) {
		return failure(500, 'Failed to resolve authenticated user.');
	}

	return success(200, {user: upserted.user, authProvider: 'firebase'});
}

async function signup(payload = {}) {
	const validation = validateFirebaseAuthPayload(payload);
	if (!validation.valid) {
		return failure(401, 'User is not authenticated.');
	}

	const upserted = await upsertUserFromAuth(validation.value);
	if (!upserted.user) {
		return failure(500, 'Failed to resolve authenticated user.');
	}

	return success(upserted.created ? 201 : 200, {user: upserted.user, authProvider: 'firebase'});
}

async function updateUserProfile(payload = {}, authUserId = '') {
	const userId = typeof authUserId === 'string' ? authUserId.trim() : '';
	if (!userId) {
		return failure(401, 'User is not authenticated.');
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
