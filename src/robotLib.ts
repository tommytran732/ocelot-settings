function robotLib(config: any) {
  const sslVisionId: number = 0,
        wsClient: WebSocket = new WebSocket('ws://localhost:8000');

  wsClient.onerror = (e) => { config.console.error('Network error.'); };
  wsClient.onmessage = (e) => { config.console.log(e.data); };
  wsClient.onopen = (e) => { config.console.log('Connected.'); };
  wsClient.onclose = (e) => { config.console.log('Disconnected.'); };

  function send(payload: any) {
     wsClient.send(JSON.stringify(payload));
  }

  return {
    moveToXY: (x: number, y: number, theta: number) => {
      send({x, y, theta, sslVisionId, cmd: 'MoveTo'});
    }
  };
}
