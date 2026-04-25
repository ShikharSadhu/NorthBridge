const WebSocket = require('ws');

let _wss = null;

function setServer(wss) {
    _wss = wss;
}

function _safeSend(client, msg) {
    try {
        client.send(msg);
    } catch (e) {
        // ignore send errors for robustness
    }
}

function broadcast(data) {
    if (!_wss) return;
    const msg = JSON.stringify(data);
    _wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            _safeSend(client, msg);
        }
    });
}

function sendToUser(userId, data) {
    if (!_wss) return;
    const msg = JSON.stringify(data);
    _wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
            _safeSend(client, msg);
        }
    });
}

module.exports = {
    setServer,
    broadcast,
    sendToUser,
};
