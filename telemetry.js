import dgram from 'node:dgram';

// Packet inspection only: FH6's game-specific field layout is not yet verified.
export function createTelemetryReceiver({host = '127.0.0.1', port = 5300, now = Date.now} = {}) {
  const socket = dgram.createSocket('udp4');
  let packets = 0, lastPacket = null, lastReceivedAt = null, listening = false, error = null;
  socket.on('message', message => {
    if (!message.length) return;
    packets += 1;
    lastPacket = { bytes: message.length, previewHex: message.subarray(0, 64).toString('hex').match(/.{2}/g).join(' ') };
    lastReceivedAt = now();
  });
  socket.on('error', e => { error = e.code || 'UDP_ERROR'; listening = false; });
  return {
    start() {
      return new Promise(resolve => {
        socket.once('listening', () => {listening = true; error = null; resolve(true);});
        socket.once('error', () => resolve(false));
        socket.bind(port, host);
      });
    },
    address() { return socket.address(); },
    snapshot() {
      return {
        state: error ? 'error' : !listening ? 'stopped' : lastReceivedAt !== null && now() - lastReceivedAt < 3000 ? 'receiving' : lastReceivedAt !== null ? 'stale' : 'waiting',
        packets, lastReceivedAt, lastPacket, error,
        format: 'unverified',
      };
    },
    close() { return new Promise(resolve => { listening = false; try { socket.close(resolve); } catch { resolve(); } }); },
  };
}
