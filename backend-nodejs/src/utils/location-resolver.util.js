const {isValidGeoPoint} = require('./geo.utils');

const KNOWN_LOCATIONS = [
	{
		name: 'kamla nagar, delhi',
		aliases: ['kamla nagar', 'kamla nagar delhi', 'kamla nagar, delhi'],
		point: {lat: 28.6808, lng: 77.2048},
	},
	{
		name: 'noida',
		aliases: ['noida', 'noida uttar pradesh', 'sector 18 noida', 'noida, uttar pradesh'],
		point: {lat: 28.5706, lng: 77.3272},
	},
	{
		name: 'gurugram',
		aliases: ['gurugram', 'gurgaon', 'gurugram haryana', 'gurgaon haryana'],
		point: {lat: 28.4595, lng: 77.0266},
	},
	{
		name: 'connaught place, delhi',
		aliases: ['connaught place', 'cp delhi', 'connaught place delhi'],
		point: {lat: 28.6315, lng: 77.2167},
	},
	{
		name: 'delhi',
		aliases: ['delhi', 'new delhi', 'delhi ncr'],
		point: {lat: 28.6139, lng: 77.209},
	},
	{
		name: 'karol bagh',
		aliases: ['Karol Bagh', 'Karol bagh new delhi', 'Karol bagh delhi ncr'],
		point: {lat: 28.6531, lng: 77.18903},
	},
	{
		name: 'shakti nagar',
		aliases: ['Shakti Nagar', 'shakti nagar new delhi', 'shakti nagar delhi'],
		point: {lat: 28.679500, lng: 77.194705},
	},
	{
		name: 'ashok vihar',
		aliases: ['Ashok Vihar', 'ashok vihar new delhi', 'ashok vihar delhi'],
		point: {lat: 28.688510, lng: 77.175318},
	},
];

function normalizeLocationText(value) {
	return typeof value === 'string'
		? value.trim().toLowerCase().replace(/\s+/g, ' ')
		: '';
}

function tryParseCoordinatePair(value) {
	if (typeof value !== 'string') {
		return null;
	}

	const match = value.match(
		/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/,
	);
	if (!match) {
		return null;
	}

	const point = {
		lat: Number(match[1]),
		lng: Number(match[2]),
	};
	return isValidGeoPoint(point) ? point : null;
}

function resolveKnownLocationPoint(location) {
	const normalized = normalizeLocationText(location);
	if (!normalized) {
		return null;
	}

	const parsedCoordinates = tryParseCoordinatePair(normalized);
	if (parsedCoordinates) {
		return {
			point: parsedCoordinates,
			matchType: 'coordinates',
			resolvedName: 'coordinate-pair',
		};
	}

	for (const entry of KNOWN_LOCATIONS) {
		if (
			entry.aliases.some(
				(alias) =>
					normalized === alias ||
					normalized.includes(alias) ||
					alias.includes(normalized),
			)
		) {
			return {
				point: entry.point,
				matchType: 'known-location',
				resolvedName: entry.name,
			};
		}
	}

	return null;
}

function resolveLocationPoint(location) {
	const resolved = resolveKnownLocationPoint(location);
	if (!resolved) {
		return null;
	}

	return {
		lat: resolved.point.lat,
		lng: resolved.point.lng,
		matchType: resolved.matchType,
		resolvedName: resolved.resolvedName,
		sourceText: normalizeLocationText(location),
	};
}

module.exports = {
	KNOWN_LOCATIONS,
	normalizeLocationText,
	resolveKnownLocationPoint,
	resolveLocationPoint,
};
