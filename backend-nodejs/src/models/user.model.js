function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toPublicUser(user) {
	if (!user || typeof user !== 'object') {
		return null;
	}

	const normalizedSkills = Array.isArray(user.skills)
		? user.skills.filter((entry) => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
		: [];

	return {
		id: normalizeString(user.id),
		name: normalizeString(user.name),
		bio: normalizeString(user.bio),
		rating: typeof user.rating === 'number' ? user.rating : 0,
		tasksDone: typeof user.tasksDone === 'number' ? user.tasksDone : 0,
		location: normalizeString(user.location),
		skills: normalizedSkills,
		profileImageUrl: normalizeString(user.profileImageUrl),
	};
}

function toPrivateUser(user) {
	const publicUser = toPublicUser(user);
	if (!publicUser) {
		return null;
	}

	return {
		...publicUser,
		phoneNumber: normalizeString(user.phoneNumber),
		email: normalizeString(user.email).toLowerCase(),
		privatePaymentQrDataUrl: normalizeString(user.privatePaymentQrDataUrl),
	};
}

function cloneAuthUser(user) {
	if (!user || typeof user !== 'object') {
		return null;
	}

	return {
		id: normalizeString(user.id),
		name: normalizeString(user.name),
		bio: normalizeString(user.bio),
		rating: typeof user.rating === 'number' ? user.rating : 0,
		tasksDone: typeof user.tasksDone === 'number' ? user.tasksDone : 0,
		location: normalizeString(user.location),
		phoneNumber: normalizeString(user.phoneNumber),
		email: normalizeString(user.email).toLowerCase(),
		skills: Array.isArray(user.skills) ? user.skills.filter((entry) => typeof entry === 'string') : [],
		profileImageUrl: normalizeString(user.profileImageUrl),
		privatePaymentQrDataUrl: normalizeString(user.privatePaymentQrDataUrl),
		password: typeof user.password === 'string' ? user.password : '',
	};
}

function isValidPublicUser(user) {
	return Boolean(
		user &&
			typeof user.id === 'string' &&
			typeof user.name === 'string' &&
			typeof user.bio === 'string' &&
			typeof user.rating === 'number' &&
			typeof user.tasksDone === 'number' &&
			typeof user.location === 'string' &&
			typeof user.phoneNumber === 'string' &&
			typeof user.email === 'string' &&
			Array.isArray(user.skills) &&
			typeof user.profileImageUrl === 'string' &&
			typeof user.privatePaymentQrDataUrl === 'string',
	);
}

module.exports = {
	normalizeString,
	toPublicUser,
	toPrivateUser,
	cloneAuthUser,
	isValidPublicUser,
};
