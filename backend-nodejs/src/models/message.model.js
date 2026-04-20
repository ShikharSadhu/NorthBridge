function normalizeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function toMessageRecord(message) {
	if (!message || typeof message !== 'object') {
		return null;
	}

	return {
		id: normalizeString(message.id),
		chatId: normalizeString(message.chatId),
		taskId: normalizeString(message.taskId),
		senderId: normalizeString(message.senderId),
		text: normalizeString(message.text),
		timestamp: normalizeString(message.timestamp),
		imageDataUrl: normalizeString(message.imageDataUrl) || undefined,
		isPaymentRequest: Boolean(message.isPaymentRequest),
	};
}

function isValidMessageRecord(message) {
	return Boolean(
		message &&
			typeof message.id === 'string' &&
			typeof message.chatId === 'string' &&
			typeof message.taskId === 'string' &&
			typeof message.senderId === 'string' &&
			typeof message.text === 'string' &&
			typeof message.timestamp === 'string' &&
			typeof message.isPaymentRequest === 'boolean',
	);
}

module.exports = {
	normalizeString,
	toMessageRecord,
	isValidMessageRecord,
};
