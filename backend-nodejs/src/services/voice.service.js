const {GoogleGenerativeAI} = require('@google/generative-ai');
const {envConfig} = require('../config/env');
const {validateVoiceTaskPayload} = require('../validators/voice.validator');
const {toVoiceTaskDraft} = require('../models/voice-task-draft.model');
const {success, failure} = require('../utils/response.util');

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const voiceAiMode = envConfig.voiceAiMode;
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const geminiModel = geminiClient
	? geminiClient.getGenerativeModel({model: 'gemini-1.5-flash'})
	: null;

function cleanJson(text) {
	if (typeof text !== 'string') {
		return '';
	}

	return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function createFallbackUserFields(userText) {
	const cleaned = typeof userText === 'string' ? userText.trim() : '';
	const shortTitle = cleaned.slice(0, 40).trim();

	return {
		title: shortTitle || 'Voice task',
		description: cleaned || 'Voice task description',
		location: 'Unknown',
		price: 0,
		scheduledAt: null,
		executionMode: 'offline',
	};
}

function extractLocation(text) {
	const locationMatch = text.match(/(?:in|at|near)\s+([^,.!?]+)/i);
	if (!locationMatch || typeof locationMatch[1] !== 'string') {
		return 'Unknown';
	}

	const location = locationMatch[1].trim();
	return location || 'Unknown';
}

function extractPrice(text) {
	const explicitMatches = [...text.matchAll(/(?:for|₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)/gi)];
	if (explicitMatches.length > 0) {
		const explicit = explicitMatches[explicitMatches.length - 1]?.[1];
		const parsedExplicit = Number(explicit);
		if (Number.isFinite(parsedExplicit)) {
			return parsedExplicit;
		}
	}

	const anyNumberMatches = [...text.matchAll(/(\d+(?:\.\d+)?)/g)];
	if (anyNumberMatches.length === 0) {
		return 0;
	}

	const fallback = anyNumberMatches[anyNumberMatches.length - 1]?.[1];
	const parsedFallback = Number(fallback);
	return Number.isFinite(parsedFallback) ? parsedFallback : 0;
}

function extractTaskFieldsLocally(userText) {
	const fallback = createFallbackUserFields(userText);
	const cleaned = typeof userText === 'string' ? userText.trim() : '';
	if (!cleaned) {
		return fallback;
	}

	const words = cleaned.split(/\s+/).filter(Boolean);
	const title = words.slice(0, 8).join(' ').trim() || fallback.title;

	return {
		title,
		description: cleaned,
		location: extractLocation(cleaned),
		price: extractPrice(cleaned),
		scheduledAt: null,
		executionMode: 'offline',
	};
}

function shouldUseGemini(localFields) {
	if (!localFields || typeof localFields !== 'object') {
		return true;
	}

	if (voiceAiMode === 'local-only') {
		return false;
	}

	if (voiceAiMode === 'gemini-first') {
		return true;
	}

	const hasLocation = localFields.location && localFields.location !== 'Unknown';
	const hasPrice = typeof localFields.price === 'number' && localFields.price > 0;
	const hasDescriptiveText =
		typeof localFields.description === 'string' && localFields.description.trim().length >= 24;

	// local-first mode: if we already have enough usable details, skip Gemini to save credits.
	return !(hasLocation && (hasPrice || hasDescriptiveText));
}

function validateExtractedFields(fields) {
	if (typeof fields.title !== 'string') {
		throw new Error('title must be a string');
	}
	if (typeof fields.description !== 'string') {
		throw new Error('description must be a string');
	}
	if (typeof fields.location !== 'string') {
		throw new Error('location must be a string');
	}
	if (typeof fields.price !== 'number' || Number.isNaN(fields.price)) {
		throw new Error('price must be a number');
	}
	if (!(typeof fields.scheduledAt === 'string' || fields.scheduledAt === null)) {
		throw new Error('scheduledAt must be a string or null');
	}
	if (fields.executionMode !== 'offline') {
		throw new Error('executionMode must be offline');
	}
}

function normalizeExtractedFields(raw, userText) {
	const fallback = createFallbackUserFields(userText);
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return fallback;
	}

	const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallback.title;
	const description =
		typeof raw.description === 'string' && raw.description.trim()
			? raw.description.trim()
			: fallback.description;
	const location =
		typeof raw.location === 'string' && raw.location.trim() ? raw.location.trim() : fallback.location;
	const price = typeof raw.price === 'number' && Number.isFinite(raw.price) ? raw.price : fallback.price;
	const scheduledAt =
		typeof raw.scheduledAt === 'string' && raw.scheduledAt.trim() ? raw.scheduledAt.trim() : null;

	return {
		title,
		description,
		location,
		price,
		scheduledAt,
		executionMode: 'offline',
	};
}

function parseGeminiJson(rawText) {
	const cleaned = cleanJson(rawText);
	try {
		return JSON.parse(cleaned);
	} catch (_error) {
		console.error('Gemini raw response:', rawText);
		throw new Error('Invalid JSON from Gemini');
	}
}

async function extractTaskFields(userText) {
	const normalizedText = typeof userText === 'string' ? userText.trim() : '';
	const localFields = extractTaskFieldsLocally(normalizedText);

	if (!normalizedText) {
		return localFields;
	}

	if (!geminiModel || !shouldUseGemini(localFields)) {
		return localFields;
	}

	const prompt = [
		'Extract ONLY task fields provided by the user.',
		'Return ONLY valid JSON with EXACTLY these keys:',
		'{"title": string, "description": string, "location": string, "price": number, "scheduledAt": string|null, "executionMode": "offline"}',
		'Do not include id, status, user IDs, or any extra keys.',
		'Use defaults if missing: location="Unknown", price=0, scheduledAt=null, executionMode="offline".',
		`User text: ${normalizedText}`,
	].join('\n');

	try {
		const result = await geminiModel.generateContent(prompt);
		const rawResponseText = result?.response?.text?.() || '';
		const parsed = parseGeminiJson(rawResponseText);
		const normalized = normalizeExtractedFields(parsed, normalizedText);
		validateExtractedFields(normalized);
		return normalized;
	} catch (_error) {
		const fallbackValidated = localFields;
		validateExtractedFields(fallbackValidated);
		return fallbackValidated;
	}
}

function generateTaskId() {
	return `t_${Math.random().toString(36).slice(2, 10)}`;
}

function buildFullTask(userFields, currentUser) {
	validateExtractedFields(userFields);

	const uid =
		currentUser && typeof currentUser.uid === 'string' ? currentUser.uid.trim() : '';
	if (!uid) {
		throw new Error('User is not authenticated.');
	}

	const name =
		currentUser && typeof currentUser.name === 'string' && currentUser.name.trim()
			? currentUser.name.trim()
			: 'Unknown User';

	return {
		id: generateTaskId(),
		title: userFields.title,
		description: userFields.description,
		location: userFields.location,
		price: userFields.price,
		scheduledAt: userFields.scheduledAt,
		executionMode: userFields.executionMode,
		postedByUserId: uid,
		postedByName: name,
		status: 'open',
		isActive: true,
		isRatingPending: false,
		acceptedAt: null,
		acceptedByUserId: null,
		completedAt: null,
		completedByUserId: null,
		completionRequestedAt: null,
		completionRequestedByUserId: null,
		distanceKm: 0,
	};
}

function parseVoiceTaskDraft(transcript) {
	const cleaned = typeof transcript === 'string' ? transcript.trim() : '';
	const words = cleaned.split(/\s+/).filter(Boolean);
	const priceMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
	const locationMatch = cleaned.match(/(?:in|at)\s+([A-Za-z0-9\s,]+)/i);
	const hasOnline = /\bonline\b|ऑनलाइन/i.test(cleaned);
	const hasOffline = /\boffline\b|ऑफलाइन/i.test(cleaned);
	const executionMode = hasOffline ? 'offline' : hasOnline ? 'online' : 'offline';

	return toVoiceTaskDraft({
		title: words.slice(0, 6).join(' ') || 'Voice task',
		description: cleaned || 'Task details from voice input.',
		location: locationMatch?.[1]?.trim() || (executionMode === 'online' ? 'Online' : 'Add location'),
		price: priceMatch ? Number(priceMatch[1]) : 0,
		scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		executionMode,
	});
}

function parseVoiceTask(payload = {}) {
	const validation = validateVoiceTaskPayload(payload);
	if (!validation.valid) {
		return failure(400, 'Transcript is required.');
	}

	const draft = parseVoiceTaskDraft(validation.value.transcript);
	// Do not block: controllers may expect immediate draft; notify via websocket if requested
	// If payload.userId is provided, emit VOICE_PARSED for that user
	if (typeof validation.value.userId === 'string' && validation.value.userId.trim()) {
		const eventService = require('./event.service');
		Promise.resolve(eventService.notifyNewMessage({users: [validation.value.userId]}, {senderId: '', ...draft})).catch(() => {});
	}

	return success(200, draft);
}

module.exports = {
	parseVoiceTask,
	parseVoiceTaskDraft,
	cleanJson,
	extractTaskFields,
	extractTaskFieldsLocally,
	buildFullTask,
};
