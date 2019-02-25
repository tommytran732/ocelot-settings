function robotLib(config: any) {
  const sslVisionId: number = 0, // Needs to be parameterized.
        wsClient: WebSocket = new WebSocket('ws://localhost:8000');

  wsClient.onerror = (e) => { config.consoleLog(`ERROR: ${JSON.stringify(e)}`); };
  wsClient.onmessage = (m) => { config.consoleLog(m.data); };

  function send(payload: any) {
    wsClient.send(JSON.stringify(payload));
  }

  return {
    moveToXY: (x: number, y: number, theta: number) => {
      send({x, y, theta, sslVisionId, cmd: 'MoveTo'});
    }
  };
}
