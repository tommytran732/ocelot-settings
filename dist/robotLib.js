function robotLib(config) {
    const sslVisionId = 0, wsClient = new WebSocket('ws://localhost:8000');
    wsClient.onerror = (e) => { config.consoleLog(`ERROR: ${JSON.stringify(e)}`); };
    wsClient.onmessage = (m) => { config.consoleLog(m.data); };
    function send(payload) {
        wsClient.send(JSON.stringify(payload));
    }
    return {
        moveToXY: (x, y, theta) => {
            send({ x, y, theta, sslVisionId, cmd: 'MoveTo' });
        }
    };
}
