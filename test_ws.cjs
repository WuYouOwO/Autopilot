const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:11211/api/v1/ws');

ws.on('open', function open() {
  console.log('connected to /api/v1/ws');
});

ws.on('message', function incoming(data) {
  console.log('received /api/v1/ws:', data.toString());
});

ws.on('error', function error(err) {
  console.log('error /api/v1/ws:', err.message);
});

const ws2 = new WebSocket('ws://127.0.0.1:11211/ws');

ws2.on('open', function open() {
  console.log('connected to /ws');
});

ws2.on('message', function incoming(data) {
  console.log('received /ws:', data.toString());
});

ws2.on('error', function error(err) {
  console.log('error /ws:', err.message);
});

setTimeout(() => {
    ws.close();
    ws2.close();
}, 3000);
