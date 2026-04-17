const {
	listPublicUsers,
	findUserByEmail,
	getPublicUserById: getPublicUserByIdFromRepository,
	authenticateUser,
	createUser,
	updateUserProfile: updateUserProfileInRepository,
} = require('../repositories/user.repository');
const {
	validateCurrentUserPayload,
	validateLoginPayload,
	validateSignupPayload,
} = require('../validators/auth.validator');
const {success, failure} = require('../utils/response.util');
const {buildMockToken} = require('../utils/token.util');

async function listUsers() {
	return success(200, await listPublicUsers());
}

async function getCurrentUser(payload = {}) {
	const validation = validateCurrentUserPayload(payload);
	if (!validation.valid) {
		return failure(401, 'User is not authenticated.');
	}

	const user = await getPublicUserByIdFromRepository(validation.value.userId);
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

	const user = await authenticateUser(validation.value.email, validation.value.password);
	if (!user) {
		return failure(401, 'Invalid email or password.');
	}

	return success(200, {user, token: buildMockToken(user.id)});
}

async function signup(payload = {}) {
	const validation = validateSignupPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Name, location, email, and password are required.');
	}

	if (await findUserByEmail(validation.value.email)) {
		return failure(409, 'Email already exists.');
	}

	const user = await createUser(validation.value);
	return success(201, {user, token: buildMockToken(user.id)});
}

async function updateUserProfile(payload = {}, authUserId = '') {
	const userId = typeof authUserId === 'string' ? authUserId.trim() : '';
	if (!userId) {
		return failure(401, 'User is not authenticated.');
	}

	const updatedUser = await updateUserProfileInRepository(userId, payload);
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
	logout,
};
