const fs = require('fs');
const path = require('path');

function checkExists(relativePath) {
	return fs.existsSync(path.join(__dirname, '..', relativePath));
}

function printDevCheck() {
	const requiredPaths = [
		'src',
		'src/index.js',
		'src/controllers',
		'src/routes',
		'src/services',
		'src/triggers',
		'src/utils',
		'docs/api-contract.md',
		'docs/migration-notes.md',
	];

	const missing = requiredPaths.filter((entry) => !checkExists(entry));
	const payload = {
		status: missing.length === 0 ? 'ok' : 'missing-files',
		checked: requiredPaths.length,
		missing,
	};

	process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
	return payload;
}

if (require.main === module) {
	printDevCheck();
}

module.exports = {
	printDevCheck,
};
