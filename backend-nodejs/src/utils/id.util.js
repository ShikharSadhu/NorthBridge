const {randomUUID} = require('crypto');

function buildPrefixedId(prefix) {
	return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

module.exports = {
	buildPrefixedId,
};function normalizePrefix(prefix) {
	return typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'id';
}

function toSafeCount(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return Math.floor(parsed);
}

function nextId(prefix, currentCount, padLength = 4, offset = 1) {
	const safePrefix = normalizePrefix(prefix);
	const safeCount = toSafeCount(currentCount);
	const safeOffset = toSafeCount(offset);
	const nextValue = safeCount + safeOffset;
	const width = Math.max(1, toSafeCount(padLength));
	return `${safePrefix}_${String(nextValue).padStart(width, '0')}`;
}

module.exports = {
	normalizePrefix,
	toSafeCount,
	nextId,
};
