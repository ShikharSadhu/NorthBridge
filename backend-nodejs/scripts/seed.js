const {getRequiredFirestoreDb} = require('../src/config/firebase');

async function printCollectionSummary() {
	const db = getRequiredFirestoreDb();
	const collections = ['users', 'tasks', 'messages', 'chats', 'reports'];
	const counts = {};

	for (const name of collections) {
		const snapshot = await db.collection(name).get();
		counts[name] = snapshot.size;
	}

	process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
	return counts;
}

if (require.main === module) {
	printCollectionSummary().catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
}

module.exports = {
	printCollectionSummary,
};
