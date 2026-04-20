function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function createValidationResult(valid, value, errors) {
	return {
		valid,
		value,
		errors,
	};
}

function validateLoginPayload(payload = {}) {
	const email = normalizeString(payload.email).toLowerCase();
	const password = typeof payload.password === 'string' ? payload.password : '';
	const errors = [];

	if (!email) {
		errors.push({field: 'email', message: 'Email is required.'});
	}

	if (!password) {
		errors.push({field: 'password', message: 'Password is required.'});
	}

	return createValidationResult(errors.length === 0, {email, password}, errors);
}

function validateFirebaseAuthPayload(payload = {}) {
	const userId = normalizeString(payload.userId);
	const email = normalizeString(payload.authEmail || payload.email).toLowerCase();
	const name = normalizeString(payload.authName || payload.name);
	const location = normalizeString(payload.location);
	const errors = [];

	if (!userId) {
		errors.push({field: 'userId', message: 'Authenticated user id is required.'});
	}

	return createValidationResult(errors.length === 0, {userId, email, name, location}, errors);
}

function validateSignupPayload(payload = {}) {
	const name = normalizeString(payload.name);
	const location = normalizeString(payload.location);
	const email = normalizeString(payload.email).toLowerCase();
	const password = typeof payload.password === 'string' ? payload.password : '';
	const errors = [];

	if (!name) {
		errors.push({field: 'name', message: 'Name is required.'});
	}

	if (!location) {
		errors.push({field: 'location', message: 'Location is required.'});
	}

	if (!email) {
		errors.push({field: 'email', message: 'Email is required.'});
	}

	if (!password) {
		errors.push({field: 'password', message: 'Password is required.'});
	}

	return createValidationResult(errors.length === 0, {name, location, email, password}, errors);
}

function validateCurrentUserPayload(payload = {}) {
	const userId = normalizeString(payload.userId);
	const errors = [];

	if (!userId) {
		errors.push({field: 'userId', message: 'User ID is required.'});
	}

	return createValidationResult(errors.length === 0, {userId}, errors);
}

function validateUpdateProfilePayload(payload = {}) {
	const allowedKeys = new Set([
		'name',
		'bio',
		'location',
		'phoneNumber',
		'email',
		'skills',
		'profileImageUrl',
		'privatePaymentQrDataUrl',
	]);
	const errors = [];
	const value = {
		name: typeof payload.name === 'string' ? normalizeString(payload.name) : undefined,
		bio: typeof payload.bio === 'string' ? normalizeString(payload.bio) : undefined,
		location: typeof payload.location === 'string' ? normalizeString(payload.location) : undefined,
		phoneNumber:
			typeof payload.phoneNumber === 'string' ? normalizeString(payload.phoneNumber) : undefined,
		email: typeof payload.email === 'string' ? normalizeString(payload.email).toLowerCase() : undefined,
		skills: Array.isArray(payload.skills)
			? payload.skills.filter((entry) => typeof entry === 'string').map((entry) => normalizeString(entry)).filter(Boolean)
			: undefined,
		profileImageUrl:
			typeof payload.profileImageUrl === 'string' ? normalizeString(payload.profileImageUrl) : undefined,
		privatePaymentQrDataUrl:
			typeof payload.privatePaymentQrDataUrl === 'string'
				? normalizeString(payload.privatePaymentQrDataUrl)
				: undefined,
	};

	for (const key of Object.keys(payload || {})) {
		if (!allowedKeys.has(key)) {
			errors.push({field: key, message: 'Unknown profile field.'});
		}
	}

	return createValidationResult(errors.length === 0, value, errors);
}

module.exports = {
	normalizeString,
	createValidationResult,
	validateLoginPayload,
	validateFirebaseAuthPayload,
	validateSignupPayload,
	validateCurrentUserPayload,
	validateUpdateProfilePayload,
};
