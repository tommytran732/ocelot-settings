function robotLib(config: any) {
  function send(payload: any) {
    config.ws.send(JSON.stringify(payload));
  }

  let sslVisionId: number = 0,
      worldState: any;

  config.ws.onmessage = (e) => {
    worldState = JSON.parse(e.data);
  };

  return {
    setId: (id: number) => {
      sslVisionId = id;
    },
    moveToXY: (x: number, y: number, theta: number) => {
      send({ x, y, theta, sslVisionId });
    },
    kick: () => {
      send({ kick: true, sslVisionId });
    },
    halt: () => {
      send({ halt: true, sslVisionId });
    }
  };
}
