const {handleApiRequest, listAvailableRoutes} = require('./routes');
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
