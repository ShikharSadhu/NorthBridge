const crypto = require('crypto');
const fs = require('fs');
const {getEnvConfig} = require('./env');

let cachedClient = null;

function isFirebaseConfigured(env = getEnvConfig()) {
	return Boolean(
		env.firebaseProjectId ||
			env.firebaseAppId ||
			env.firebaseDatabaseURL ||
			env.firebaseStorageBucket ||
			env.firebaseCredentialsJson ||
			env.googleApplicationCredentials ||
			env.enableFirebaseEmulator ||
			env.firestoreEmulatorHost,
	);
}

function parseServiceAccountJson(json) {
	if (!json || typeof json !== 'string') {
		return null;
	}

	try {
		return JSON.parse(json);
	} catch (_error) {
		if (fs.existsSync(json)) {
			try {
				return JSON.parse(fs.readFileSync(json, 'utf8'));
			} catch (_fileError) {
				return null;
			}
		}

		return null;
	}
}

function getFirebaseConfig(env = getEnvConfig()) {
	return {
		projectId: env.firebaseProjectId || null,
		databaseURL: env.firebaseDatabaseURL || null,
		storageBucket: env.firebaseStorageBucket || null,
		appId: env.firebaseAppId || null,
		credentialsProvided: Boolean(env.firebaseCredentialsJson),
		credentialsPathProvided: Boolean(env.googleApplicationCredentials),
		enableEmulator: Boolean(env.enableFirebaseEmulator),
		firestoreEmulatorHost: env.firestoreEmulatorHost || null,
	};
}

function createFirebaseAdminConfig(env = getEnvConfig()) {
	return {
		configured: isFirebaseConfigured(env),
		config: getFirebaseConfig(env),
	};
}

function base64UrlEncode(input) {
	return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function normalizePrivateKey(privateKey) {
	return typeof privateKey === 'string' ? privateKey.replace(/\\n/g, '\n') : '';
}

function createJwtAssertion(serviceAccount, projectId) {
	const now = Math.floor(Date.now() / 1000);
	const header = {
		alg: 'RS256',
		typ: 'JWT',
		kid: serviceAccount.private_key_id,
	};
	const payload = {
		iss: serviceAccount.client_email,
		sub: serviceAccount.client_email,
		aud: 'https://oauth2.googleapis.com/token',
		scope: 'https://www.googleapis.com/auth/datastore',
		iat: now,
		exp: now + 3600,
		project_id: projectId,
	};
	const headerPart = base64UrlEncode(JSON.stringify(header));
	const payloadPart = base64UrlEncode(JSON.stringify(payload));
	const signer = crypto.createSign('RSA-SHA256');
	signer.update(`${headerPart}.${payloadPart}`);
	signer.end();
	const signature = signer.sign(normalizePrivateKey(serviceAccount.private_key));
	return `${headerPart}.${payloadPart}.${base64UrlEncode(signature)}`;
}

function serializeFirestoreValue(value) {
	if (value === null) {
		return {nullValue: null};
	}

	if (Array.isArray(value)) {
		return {
			arrayValue: {
				values: value.map((entry) => serializeFirestoreValue(entry)),
			},
		};
	}

	if (value instanceof Date) {
		return {timestampValue: value.toISOString()};
	}

	if (typeof value === 'string') {
		return {stringValue: value};
	}

	if (typeof value === 'number') {
		return {doubleValue: value};
	}

	if (typeof value === 'boolean') {
		return {booleanValue: value};
	}

	if (typeof value === 'object') {
		const fields = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			if (typeof nestedValue !== 'undefined') {
				fields[key] = serializeFirestoreValue(nestedValue);
			}
		}

		return {
			mapValue: {
				fields,
			},
		};
	}

	return {nullValue: null};
}

function deserializeFirestoreValue(value) {
	if (!value || typeof value !== 'object') {
		return null;
	}

	if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) {
		return null;
	}

	if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) {
		return value.stringValue;
	}

	if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) {
		return Number(value.doubleValue);
	}

	if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) {
		return Number(value.integerValue);
	}

	if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) {
		return Boolean(value.booleanValue);
	}

	if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) {
		return value.timestampValue;
	}

	if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
		return Array.isArray(value.arrayValue.values)
			? value.arrayValue.values.map((entry) => deserializeFirestoreValue(entry))
			: [];
	}

	if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
		const nestedFields = value.mapValue.fields || {};
		const result = {};
		for (const [key, nestedValue] of Object.entries(nestedFields)) {
			result[key] = deserializeFirestoreValue(nestedValue);
		}

		return result;
	}

	return null;
}

function deserializeFirestoreDocument(document) {
	if (!document || typeof document !== 'object') {
		return null;
	}

	const fields = document.fields || {};
	const data = {};
	for (const [key, value] of Object.entries(fields)) {
		data[key] = deserializeFirestoreValue(value);
	}

	const nameParts = typeof document.name === 'string' ? document.name.split('/') : [];
	const id = nameParts[nameParts.length - 1] || data.id || data.chatId || null;
	return {
		id,
		...data,
	};
}

class DocumentSnapshot {
	constructor(document) {
		this._document = document;
		this.id = document?.id || null;
		this.exists = Boolean(document);
	}

	data() {
		if (!this._document) {
			return undefined;
		}

		const {id, ...data} = this._document;
		return data;
	}
}

class QuerySnapshot {
	constructor(documents) {
		this.docs = documents.map((document) => new DocumentSnapshot(document));
		this.empty = this.docs.length === 0;
	}
}

class FirestoreClient {
	constructor(env = getEnvConfig()) {
		const serviceAccount = parseServiceAccountJson(env.firebaseCredentialsJson);
		this.projectId = env.firebaseProjectId || serviceAccount?.project_id || 'demo-project';
		this.baseUrl = env.enableFirebaseEmulator && env.firestoreEmulatorHost
			? `http://${env.firestoreEmulatorHost}`
			: 'https://firestore.googleapis.com';
		this.databasePath = `/v1/projects/${this.projectId}/databases/(default)/documents`;
		this.serviceAccount = serviceAccount;
		this.accessToken = null;
		this.accessTokenExpiresAt = 0;
	}

	collection(collectionName) {
		return new CollectionReference(this, collectionName);
	}

	async _getAccessToken() {
		if (this.baseUrl.startsWith('http://')) {
			return null;
		}

		if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
			return this.accessToken;
		}

		if (!this.serviceAccount?.client_email || !this.serviceAccount?.private_key) {
			throw new Error('Firestore credentials are not configured.');
		}

		const assertion = createJwtAssertion(this.serviceAccount, this.projectId);
		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion,
			}),
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to obtain Firestore access token: ${text}`);
		}

		const payload = await response.json();
		this.accessToken = payload.access_token;
		this.accessTokenExpiresAt = Date.now() + (Number(payload.expires_in) || 3600) * 1000 - 60000;
		return this.accessToken;
	}

	async _request(method, path, body = null) {
		const url = `${this.baseUrl}${path}`;
		const headers = {
			'Content-Type': 'application/json',
		};

		const accessToken = await this._getAccessToken();
		if (accessToken) {
			headers.Authorization = `Bearer ${accessToken}`;
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok && response.status !== 404) {
			const text = await response.text();
			throw new Error(`Firestore request failed (${response.status}): ${text}`);
		}

		if (response.status === 404) {
			return null;
		}

		if (response.status === 204) {
			return null;
		}

		return response.json();
	}

	async listCollection(collectionName) {
		const payload = await this._request('GET', `${this.databasePath}/${encodeURIComponent(collectionName)}`);
		const documents = Array.isArray(payload?.documents) ? payload.documents : [];
		return documents.map((document) => deserializeFirestoreDocument(document));
	}

	async getDocument(collectionName, documentId) {
		const payload = await this._request(
			'GET',
			`${this.databasePath}/${encodeURIComponent(collectionName)}/${encodeURIComponent(documentId)}`,
		);
		return payload ? deserializeFirestoreDocument(payload) : null;
	}

	async setDocument(collectionName, documentId, data, options = {}) {
		const documentPath = `${this.databasePath}/${encodeURIComponent(collectionName)}/${encodeURIComponent(documentId)}`;
		if (!options.merge) {
			await this._request('DELETE', documentPath);
		}

		let payload = data;
		if (options.merge) {
			const existing = await this.getDocument(collectionName, documentId);
			payload = {
				...(existing || {}),
				...data,
			};
		}

		await this._request('PATCH', documentPath, {
			fields: serializeFirestoreDocument(payload),
		});
		return payload;
	}

	async deleteDocument(collectionName, documentId) {
		const documentPath = `${this.databasePath}/${encodeURIComponent(collectionName)}/${encodeURIComponent(documentId)}`;
		await this._request('DELETE', documentPath);
	}
}

class CollectionReference {
	constructor(client, collectionName) {
		this.client = client;
		this.collectionName = collectionName;
	}

	async get() {
		const documents = await this.client.listCollection(this.collectionName);
		return new QuerySnapshot(documents);
	}

	doc(documentId) {
		return new DocumentReference(this.client, this.collectionName, documentId);
	}

	where(field, operator, value) {
		return new QueryReference(this.client, this.collectionName, [{field, operator, value}], null);
	}
}

class DocumentReference {
	constructor(client, collectionName, documentId) {
		this.client = client;
		this.collectionName = collectionName;
		this.documentId = documentId;
	}

	async get() {
		const document = await this.client.getDocument(this.collectionName, this.documentId);
		return new DocumentSnapshot(document);
	}

	async set(data, options = {}) {
		return this.client.setDocument(this.collectionName, this.documentId, data, options);
	}

	async delete() {
		return this.client.deleteDocument(this.collectionName, this.documentId);
	}
}

class QueryReference {
	constructor(client, collectionName, filters, limitCount) {
		this.client = client;
		this.collectionName = collectionName;
		this.filters = filters;
		this.limitCount = limitCount;
	}

	where(field, operator, value) {
		return new QueryReference(this.client, this.collectionName, [...this.filters, {field, operator, value}], this.limitCount);
	}

	limit(count) {
		return new QueryReference(this.client, this.collectionName, this.filters, count);
	}

	async get() {
		let documents = await this.client.listCollection(this.collectionName);
		for (const filter of this.filters) {
			documents = documents.filter((document) => {
				const currentValue = document?.[filter.field];
				if (filter.operator !== '==') {
					return false;
				}
				return currentValue === filter.value;
			});
		}

		if (typeof this.limitCount === 'number') {
			documents = documents.slice(0, this.limitCount);
		}

		return new QuerySnapshot(documents);
	}
}

function serializeFirestoreDocument(data) {
	const fields = {};
	for (const [key, value] of Object.entries(data || {})) {
		if (typeof value !== 'undefined') {
			fields[key] = serializeFirestoreValue(value);
		}
	}

	return fields;
}

function initializeFirebaseAdmin(env = getEnvConfig()) {
	if (cachedClient) {
		return cachedClient;
	}

	if (!isFirebaseConfigured(env)) {
		return null;
	}

	cachedClient = new FirestoreClient(env);
	return cachedClient;
}

function getFirestoreDb(env = getEnvConfig()) {
	return initializeFirebaseAdmin(env);
}

function getRequiredFirestoreDb(env = getEnvConfig()) {
	const db = getFirestoreDb(env);
	if (!db) {
		throw new Error('Firestore is not configured.');
	}

	return db;
}

function hasFirestoreConnection(env = getEnvConfig()) {
	return Boolean(initializeFirebaseAdmin(env));
}
module.exports = {
isFirebaseConfigured,
getFirebaseConfig,
createFirebaseAdminConfig,
initializeFirebaseAdmin,
getFirestoreDb,
hasFirestoreConnection,
getRequiredFirestoreDb,
serializeFirestoreValue,
deserializeFirestoreValue,
};
