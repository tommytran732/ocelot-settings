function robotLib(config: any) {
  const sslVisionId: number = 0,
        wsClient: WebSocket = new WebSocket('ws://localhost:8000');

  wsClient.onerror = (e) => { config.console.error('Network error.'); };
  wsClient.onmessage = (m) => { config.console.log(m.data); };

  function send(payload: any) {
    wsClient.send(JSON.stringify(payload));
  }

  return {
    moveToXY: (x: number, y: number, theta: number) => {
      send({x, y, theta, sslVisionId, cmd: 'MoveTo'});
    }
  };
}
