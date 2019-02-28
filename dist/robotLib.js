function robotLib(config) {
    const sslVisionId = 0, wsClient = new WebSocket('ws://localhost:8000');
    wsClient.onerror = (e) => { config.console.error('Network error.'); };
    wsClient.onmessage = (e) => { config.console.log(e.data); };
    wsClient.onopen = (e) => { config.console.log('Connected.'); };
    wsClient.onclose = (e) => { config.console.log('Disconnected.'); };
    function send(payload) {
        wsClient.send(JSON.stringify(payload));
    }
    return {
        moveToXY: (x, y, theta) => {
            send({ x, y, theta, sslVisionId, cmd: 'MoveTo' });
        }
    };
}
