const WebSocket = require('ws');

function parseMessage(message) {
	return JSON.parse(message.toString());
}

function connectWs(url) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		const timer = setTimeout(() => {
			ws.terminate();
			reject(new Error(`Timed out connecting to ${url}`));
		}, 3000);

		function cleanup() {
			clearTimeout(timer);
			ws.off('message', onMessage);
			ws.off('error', onError);
		}

		function onMessage(rawMessage) {
			const parsed = parseMessage(rawMessage);
			if (parsed.type !== 'CONNECTED') {
				return;
			}

			cleanup();
			resolve(ws);
		}

		function onError(error) {
			cleanup();
			reject(error);
		}

		ws.on('message', onMessage);
		ws.once('error', (error) => {
			onError(error);
		});
	});
}

function waitForMessage(ws, predicate = () => true, timeoutMs = 3000) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			ws.off('message', onMessage);
			reject(new Error('Timed out waiting for websocket message.'));
		}, timeoutMs);

		function onMessage(rawMessage) {
			let parsed;
			try {
				parsed = parseMessage(rawMessage);
			} catch (error) {
				clearTimeout(timer);
				ws.off('message', onMessage);
				reject(error);
				return;
			}

			if (!predicate(parsed)) {
				return;
			}

			clearTimeout(timer);
			ws.off('message', onMessage);
			resolve(parsed);
		}

		ws.on('message', onMessage);
	});
}

function closeWs(ws) {
	return new Promise((resolve) => {
		if (!ws || ws.readyState === WebSocket.CLOSED) {
			resolve();
			return;
		}

		ws.once('close', resolve);
		ws.close();
		setTimeout(resolve, 250);
	});
}

module.exports = {
	closeWs,
	connectWs,
	waitForMessage,
};
