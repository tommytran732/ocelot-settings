function robotLib(config: any) {
  function send(payload: any) {
    config.ws.send(JSON.stringify(payload));
  }

  return {
    moveToXY: (x: number, y: number, theta: number) => {
      send({x, y, theta, sslVisionId: 0, cmd: 'MoveTo'});
    },
    kick: () => {
      send({sslVisionId: 0, cmd: 'Kick'});
    }
  };
}
