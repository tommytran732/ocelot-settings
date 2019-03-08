function robotLib(config) {
    function send(payload) {
        config.ws.send(JSON.stringify(payload));
    }
    return {
        moveToXY: (x, y, theta) => {
            send({ x, y, theta, sslVisionId: 0 });
        },
        kick: () => {
            send({ sslVisionId: 0, kick: true });
        },
        halt: () => {
            send({ sslVisionId: 0, halt: true });
        }
    };
}
