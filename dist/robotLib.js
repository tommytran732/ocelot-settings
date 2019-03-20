function robotLib(config) {
    function send(payload) {
        config.ws.send(JSON.stringify(payload));
    }
    let sslVisionId = 0, worldState;
    config.ws.onmessage = (e) => {
        worldState = JSON.parse(e.data);
    };
    return {
        setId: (id) => {
            sslVisionId = id;
        },
        moveToXY: (x, y, theta) => {
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
