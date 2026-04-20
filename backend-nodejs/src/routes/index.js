const {authRoutes} = require('./auth.routes');
const {userRoutes} = require('./user.routes');
const {taskRoutes} = require('./task.routes');
const {chatRoutes} = require('./chat.routes');
const {voiceRoutes} = require('./voice.routes');
const {healthRoutes} = require('./health.routes');
const {reportRoutes} = require('./report.routes');
const {normalizeHeaders, getAuthContext} = require('../middlewares/auth.middleware');

const routes = [
	...healthRoutes,
	...authRoutes,
	...userRoutes,
	...taskRoutes,
	...chatRoutes,
	...voiceRoutes,
	...reportRoutes,
];

function normalizeBody(body) {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return {};
	}

	return body;
}

function parseQuery(path) {
	const queryIndex = path.indexOf('?');
	if (queryIndex < 0) {
		return {};
	}

	const queryString = path.slice(queryIndex + 1).trim();
	if (!queryString) {
		return {};
	}

	const query = new URLSearchParams(queryString);
	const result = {};
	for (const [key, value] of query.entries()) {
		result[key] = value;
	}

	return result;
}

function splitPath(path) {
	return path
		.split('?')[0]
		.split('/')
		.filter((segment) => segment.length > 0);
}

function matchRoutePath(routePath, requestPath) {
	const routeSegments = splitPath(routePath);
	const requestSegments = splitPath(requestPath);

	if (routeSegments.length !== requestSegments.length) {
		return {matched: false, params: {}};
	}

	const params = {};
	for (let index = 0; index < routeSegments.length; index += 1) {
		const routeSegment = routeSegments[index];
		const requestSegment = requestSegments[index];

		if (routeSegment.startsWith(':')) {
			params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
			continue;
		}

		if (routeSegment !== requestSegment) {
			return {matched: false, params: {}};
		}
	}

	return {matched: true, params};
}

function resolveRoute(method, path) {
	for (const route of routes) {
		if (route.method !== method) {
			continue;
		}

		const match = matchRoutePath(route.path, path);
		if (match.matched) {
			return {route, params: match.params};
		}
	}

	return {route: null, params: {}};
}

function hasPathForAnyMethod(path) {
	for (const route of routes) {
		const match = matchRoutePath(route.path, path);
		if (match.matched) {
			return true;
		}
	}

	return false;
}

async function handleApiRequest(request) {
	const method = String(request.method || '').toUpperCase();
	const path = typeof request.path === 'string' ? request.path : '/';
	const query = parseQuery(path);
	const normalizedBody = normalizeBody(request.body);
	const normalizedHeaders = normalizeHeaders(request.headers);
	const authContext = await getAuthContext(normalizedHeaders);
	const userId = authContext.userId;
	const authEmail = typeof authContext.email === 'string' ? authContext.email : undefined;
	const authName = typeof authContext.name === 'string' ? authContext.name : undefined;

	const payload = {
		...query,
		...normalizedBody,
		...(userId ? {userId} : {}),
		...(authEmail ? {authEmail} : {}),
		...(authName ? {authName} : {}),
	};

	if (method !== 'GET' && method !== 'POST' && method !== 'PATCH') {
		return {
			status: 405,
			body: {
				message: `Method ${request.method} is not allowed.`,
			},
		};
	}

	const {route, params} = resolveRoute(method, path);
	if (!route) {
		if (hasPathForAnyMethod(path)) {
			return {
				status: 405,
				body: {
					message: `Method ${request.method} is not allowed for ${path}`,
				},
			};
		}

		return {
			status: 404,
			body: {
				message: `No route for ${request.method} ${path}`,
			},
		};
	}

	let result;
	try {
		result = await Promise.resolve(route.execute(params, payload, userId));
	} catch (_error) {
		return {
			status: 500,
			body: {
				message: 'Route execution failed.',
			},
		};
	}
	if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
		return {
			status: result.status,
			body: result.body,
		};
	}

	return {
		status: 500,
		body: {
			message: 'Route returned an invalid response shape.',
		},
	};
}

function listAvailableRoutes() {
	return routes.map((route) => ({method: route.method, path: route.path}));
}

module.exports = {
	routes,
	handleApiRequest,
	listAvailableRoutes,
	normalizeBody,
	normalizeHeaders,
	extractUserId: async (headers) => (await getAuthContext(headers)).userId,
	parseQuery,
	matchRoutePath,
};
