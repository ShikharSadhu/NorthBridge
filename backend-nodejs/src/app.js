const {handleApiRequest, listAvailableRoutes} = require('./routes');

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

function writeJson(res, status, payload) {
	const body = JSON.stringify(payload ?? {});
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Content-Length', Buffer.byteLength(body));
	res.end(body);
}

function createAppHandler() {
	return async function appHandler(req, res) {
		const method = String(req.method || '').toUpperCase();
		const path = typeof req.url === 'string' ? req.url : '/';

		if (method === 'GET' && path.split('?')[0] === '/v1/routes') {
			writeJson(res, 200, {routes: listAvailableRoutes()});
			return;
		}

		const rawBody = await collectRequestBody(req);
		const parsedBody = parseJsonBody(rawBody);

		if (parsedBody === null) {
			writeJson(res, 400, {message: 'Invalid JSON body.'});
			return;
		}

		const result = await handleApiRequest({
			method,
			path,
			body: parsedBody,
			headers: req.headers || {},
		});

		writeJson(res, result.status, result.body);
	};
}

module.exports = {
	parseJsonBody,
	collectRequestBody,
	writeJson,
	createAppHandler,
};
