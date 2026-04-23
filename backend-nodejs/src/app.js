const {handleApiRequest, listAvailableRoutes} = require('./routes');
const {envConfig} = require('./config/env');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../public');

function tryServeStatic(pathname, res) {
	const safePath = pathname.replace(/\?.*$/, '').replace(/^\/+/, '');
	if (!safePath) {
		return false;
	}

	const resolvedPath = path.resolve(PUBLIC_DIR, safePath);
	if (!resolvedPath.startsWith(PUBLIC_DIR)) {
		return false;
	}

	if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
		return false;
	}

	const ext = path.extname(resolvedPath).toLowerCase();
	const contentTypeByExt = {
		'.html': 'text/html; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.js': 'application/javascript; charset=utf-8',
		'.json': 'application/json; charset=utf-8',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.svg': 'image/svg+xml',
	};

	const content = fs.readFileSync(resolvedPath);
	res.statusCode = 200;
	res.setHeader('Content-Type', contentTypeByExt[ext] || 'application/octet-stream');
	res.setHeader('Content-Length', content.length);
	res.end(content);
	return true;
}

function parseJsonBody(rawBody) {
	if (!rawBody || !rawBody.trim()) {
		return {};
	}

	try {
		const parsed = JSON.parse(rawBody);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return {};
		}

		return parsed;
	} catch (_error) {
		return null;
	}
}

function collectRequestBody(req) {
	return new Promise((resolve) => {
		let raw = '';

		req.on('data', (chunk) => {
			raw += chunk;
		});

		req.on('end', () => {
			resolve(raw);
		});

		req.on('error', () => {
			resolve('');
		});
	});
}

function enrichPayloadWithRequestId(payload, requestId) {
	if (!requestId || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return payload;
	}

	if (payload.requestId) {
		return payload;
	}

	return {
		...payload,
		requestId,
	};
}

function writeJson(res, status, payload, requestId) {
	const enrichedPayload = enrichPayloadWithRequestId(payload ?? {}, requestId);
	const body = JSON.stringify(enrichedPayload);
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Content-Length', Buffer.byteLength(body));
	res.end(body);
}

function generateRequestId() {
	if (typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `req_${Math.random().toString(36).slice(2, 12)}`;
}

function resolveRequestId(headers = {}) {
	const candidate = headers['x-request-id'];
	if (typeof candidate === 'string' && candidate.trim()) {
		return candidate.trim();
	}

	return generateRequestId();
}

function logRequestSummary({requestId, method, path, status, durationMs}) {
	const summary = {
		timestamp: new Date().toISOString(),
		requestId,
		method,
		path,
		status,
		durationMs,
	};

	console.log(JSON.stringify(summary));
}

function resolveAllowedOrigin(origin) {
	if (!origin || typeof origin !== 'string') {
		return null;
	}

	const configuredOrigins = envConfig.corsOrigins || [];
	if (configuredOrigins.length === 0) {
		return origin;
	}

	if (configuredOrigins.includes('*')) {
		return '*';
	}

	if (configuredOrigins.includes(origin)) {
		return origin;
	}

	return null;
}

function applyCorsHeaders(req, res) {
	const originHeader = req.headers?.origin;
	const allowedOrigin = resolveAllowedOrigin(originHeader);
	if (!allowedOrigin) {
		return false;
	}

	res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
	res.setHeader('Vary', 'Origin');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	res.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Requested-With',
	);

	if (envConfig.corsAllowCredentials) {
		res.setHeader('Access-Control-Allow-Credentials', 'true');
	}

	return true;
}

function createAppHandler() {
	return async function appHandler(req, res) {
		const startedAt = Date.now();
		const method = String(req.method || '').toUpperCase();
		const path = typeof req.url === 'string' ? req.url : '/';
		const requestId = resolveRequestId(req.headers || {});
		res.setHeader('X-Request-Id', requestId);

		applyCorsHeaders(req, res);

		if (method === 'OPTIONS') {
			res.statusCode = 204;
			res.end();
			logRequestSummary({
				requestId,
				method,
				path,
				status: 204,
				durationMs: Date.now() - startedAt,
			});
			return;
		}

		if (method === 'GET' && path.split('?')[0] === '/location-map') {
			if (tryServeStatic('location-map.html', res)) {
				return;
			}
		}

		if (method === 'GET' && path.split('?')[0].startsWith('/public/')) {
			const relative = path.split('?')[0].replace('/public/', '');
			if (tryServeStatic(relative, res)) {
				return;
			}
		}

		if (method === 'GET' && path.split('?')[0] === '/v1/routes') {
			writeJson(res, 200, {routes: listAvailableRoutes()}, requestId);
			logRequestSummary({
				requestId,
				method,
				path,
				status: 200,
				durationMs: Date.now() - startedAt,
			});
			return;
		}

		const rawBody = await collectRequestBody(req);
		const parsedBody = parseJsonBody(rawBody);

		if (parsedBody === null) {
			writeJson(res, 400, {message: 'Invalid JSON body.'}, requestId);
			logRequestSummary({
				requestId,
				method,
				path,
				status: 400,
				durationMs: Date.now() - startedAt,
			});
			return;
		}

		const result = await handleApiRequest({
			method,
			path,
			body: parsedBody,
			headers: req.headers || {},
			requestId,
		});

		writeJson(res, result.status, result.body, requestId);
		logRequestSummary({
			requestId,
			method,
			path,
			status: result.status,
			durationMs: Date.now() - startedAt,
		});
	};
}

module.exports = {
	parseJsonBody,
	collectRequestBody,
	writeJson,
	createAppHandler,
};
