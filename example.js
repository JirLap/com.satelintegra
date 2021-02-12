constnet = require('net');
constPORT = 1234, HOST = 'localhost';
classClient {
    constructor(port, address) {
        this.socket = newnet.Socket();
        this.address = address || HOST;
        this.port = port || PORT;
        this.init();
    }
    init() {
        varclient = this;
        client.socket.connect(client.port, client.address, () => {
            console.log(`Client connected to: ${client.address} : ${client.port}`);
        });
        client.socket.on('close', () => {
            console.log('Client closed');
        });
    }
    sendMessage(message) {
        varclient = this;
        return new Promise((resolve, reject) => {
            client.socket.write(message);
            client.socket.on('data', (data) => {
                resolve(data);
                if (data.toString().endsWith('exit')) {
                    client.socket.destroy();
                }
            });
            client.socket.on('error', (err) => {
                reject(err);
            });
        });
    }
}
module.exports = Client;