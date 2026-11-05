import dgram from 'node:dgram';
import {decodeHorizonPacket} from './fh6-decoder.js';
import {SESSION_SCHEMA} from './public/telemetry-analysis.js';

// Bounded capture using a community-cross-checked decoder; local game validation is still required.
export function createTelemetryReceiver({host = '127.0.0.1', port = 5300, now = Date.now} = {}) {
  const socket = dgram.createSocket('udp4');
  let packets = 0, lastPacket = null, lastReceivedAt = null, listening = false, error = null;
  let decodedPackets=0, rejectedPackets=0, latest=null, decodedAt=null, decodeError=null, samples=[], lastStored=null;
  socket.on('message', message => {
    if (!message.length) return;
    packets += 1;
    lastPacket = { bytes: message.length, previewHex: message.subarray(0, 64).toString('hex').match(/.{2}/g).join(' ') };
    lastReceivedAt = now();
    try {
      const decoded=decodeHorizonPacket(message);decodedPackets++;decodedAt=now();decodeError=null;latest=decoded;
      if(decoded.isRaceOn && decoded.carOrdinal>=0){
        if(samples.length && samples.at(-1).carOrdinal!==decoded.carOrdinal){samples=[];lastStored=null;}
        const stamp=now();
        if(lastStored===null || stamp-lastStored>=15){
          samples.push({...decoded,gameTimestampMs:decoded.timestampMs,timestampMs:stamp});lastStored=stamp;
          if(samples.length>18000)samples.shift();
        }
      }
    } catch(e){rejectedPackets++;decodeError=e.message;}

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
        receiver:{host,port:listening?socket.address().port:port},
        format: latest ? 'horizon324-community' : 'unverified',
        decodedPackets,rejectedPackets,decodeError,decodedAt,decodedAgeMs:decodedAt===null?null:Math.max(0,now()-decodedAt),latest,recordedSamples:samples.length,
        decoderValidation:'Community layout cross-checked against independent implementations; actual FH6 validation pending on this PC.',
      };
    },
    reset() {samples=[];lastStored=null;},
    session() { return {schema:SESSION_SCHEMA,source:'Live UDP capture; community Horizon 324-byte decoder',timestampBasis:'receiver UTC milliseconds',sampling:'Minimum 15 ms sample interval; last 18,000 active samples; resets on car change',samples:samples.map(s=>({...s}))}; },
    close() { return new Promise(resolve => { listening = false; try { socket.close(resolve); } catch { resolve(); } }); },
  };
}
