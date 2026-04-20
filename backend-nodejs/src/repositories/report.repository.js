const {getRequiredFirestoreDb} = require('../config/firebase');
const {buildPrefixedId} = require('../utils/id.util');
const {toReportRecord, normalizeString} = require('../models/report.model');

async function createReport(input = {}) {
	const created = toReportRecord({
		id: buildPrefixedId('r'),
		targetType: normalizeString(input.targetType),
		targetId: normalizeString(input.targetId),
		reporterUserId: normalizeString(input.reporterUserId),
		reason: normalizeString(input.reason),
		details: normalizeString(input.details) || undefined,
		status: 'open',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	const db = getRequiredFirestoreDb();
	await db.collection('reports').doc(created.id).set(created);

	return created;
}

async function listReportsByReporterUserId(reporterUserId) {
	const normalizedReporterUserId = normalizeString(reporterUserId);
	if (!normalizedReporterUserId) {
		return [];
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('reports').where('reporterUserId', '==', normalizedReporterUserId).get();
	return snapshot.docs.map((doc) => toReportRecord({id: doc.id, ...doc.data()}));
}

async function getReportById(reportId) {
	const normalizedReportId = normalizeString(reportId);
	if (!normalizedReportId) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const snapshot = await db.collection('reports').doc(normalizedReportId).get();
	if (!snapshot.exists) {
		return null;
	}

	return toReportRecord({id: snapshot.id, ...snapshot.data()});
}

async function updateReportStatus(reportId, status) {
	const normalizedReportId = normalizeString(reportId);
	const normalizedStatus = normalizeString(status).toLowerCase();
	if (!normalizedReportId || !normalizedStatus) {
		return null;
	}

	const allowedStatuses = new Set(['open', 'reviewing', 'resolved']);
	if (!allowedStatuses.has(normalizedStatus)) {
		return null;
	}

	const db = getRequiredFirestoreDb();
	const ref = db.collection('reports').doc(normalizedReportId);
	const snapshot = await ref.get();
	if (!snapshot.exists) {
		return null;
	}

	const updates = {
		status: normalizedStatus,
		updatedAt: new Date().toISOString(),
	};
	await ref.set(updates, {merge: true});
	return toReportRecord({id: snapshot.id, ...snapshot.data(), ...updates});
}

module.exports = {
	createReport,
	listReportsByReporterUserId,
	getReportById,
	updateReportStatus,
};
