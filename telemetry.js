import {createDragCapture} from './drag-capture.js';
import {resolveCar} from './car-identities.js';
import {emptyEngineMeasurements,observeEngine,engineKey} from './telemetry-engine.js';
import dgram from 'node:dgram';
import {decodeHorizonPacket,inspectHorizonPacket,readHorizonChannels} from './fh6-decoder.js';
import {SESSION_SCHEMA} from './public/telemetry-analysis.js';

// Bounded capture using a community-cross-checked decoder; local game validation is still required.
export function createTelemetryReceiver({host = '127.0.0.1', port = 5300, now = Date.now} = {}) {
  const socket = dgram.createSocket('udp4');
  const dragCapture=createDragCapture({now});
  let packets = 0, lastPacket = null, lastReceivedAt = null, listening = false, error = null;
  let engineMeasurements=emptyEngineMeasurements();
  let rawPacket=null,lastInspection=null,lastRejected=null,readings=null;
  let decodedPackets=0, rejectedPackets=0, latest=null, decodedAt=null, decodeError=null, samples=[], lastStored=null;
  socket.on('message', message => {
    if (!message.length) return;
    packets += 1;
    lastPacket = { bytes: message.length, previewHex: message.subarray(0, 64).toString('hex').match(/.{2}/g).join(' ') };
    lastReceivedAt = now();readings=readHorizonChannels(message);rawPacket=Buffer.from(message.subarray(0,1024));lastInspection=null;
    try {
      const decoded=decodeHorizonPacket(message);engineMeasurements=observeEngine(engineMeasurements,decoded);dragCapture.ingest(decoded);decodedPackets++;decodedAt=now();decodeError=null;latest=decoded;
      if(decoded.isRaceOn && decoded.carOrdinal>=0){
        if(samples.length && engineKey(samples.at(-1))!==engineKey(decoded)){samples=[];lastStored=null;}
        const stamp=now();
        if(lastStored===null || stamp-lastStored>=15){
          samples.push({...decoded,gameTimestampMs:decoded.timestampMs,timestampMs:stamp});lastStored=stamp;
          if(samples.length>18000)samples.shift();
        }
      }
    } catch(e){rejectedPackets++;decodeError=e.message;lastInspection=e.inspection||null;lastRejected={receivedAt:lastReceivedAt,bytes:message.length,truncated:message.length>rawPacket.length,hex:rawPacket.toString('hex'),inspection:lastInspection};}

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
        dragCapture:dragCapture.snapshot(),
        receiver:{host,port:listening?socket.address().port:port},
        format: latest ? 'horizon324-community' : 'unverified',
        decodedPackets,rejectedPackets,decodeError,decodeChecks:lastInspection?.checks||null,decodedAt,decodedAgeMs:decodedAt===null?null:Math.max(0,now()-decodedAt),latest,readings,car:latest?.isRaceOn?resolveCar(latest.carOrdinal):null,engineMeasurements:{...engineMeasurements},recordedSamples:samples.length,
        decoderValidation:'Community layout cross-checked against independent implementations; actual FH6 validation pending on this PC.',
      };
    },
    diagnostics(){if(!rawPacket)return null;return {schema:'forza-ingenium-packet-diagnostics/v1',snapshot:this.snapshot(),latestPacket:{receivedAt:lastReceivedAt,bytes:lastPacket.bytes,truncated:lastPacket.bytes>rawPacket.length,hex:rawPacket.toString('hex'),inspection:lastInspection||inspectHorizonPacket(rawPacket)},lastRejected};},
    startDrag(){const s=this.snapshot();if(s.state!=='receiving'||s.decodeError||s.decodedAgeMs===null||s.decodedAgeMs>=3000)throw new Error('Connect fresh, valid driving telemetry before starting a drag capture.');return dragCapture.start(s.latest);},
    stopDrag(){return dragCapture.stop();},
    dragSession(){return dragCapture.session();},
    reset() {samples=[];lastStored=null;engineMeasurements=emptyEngineMeasurements();},
    session() { return {schema:SESSION_SCHEMA,source:'Live UDP capture; community Horizon 324-byte decoder',timestampBasis:'receiver UTC milliseconds',sampling:'Minimum 15 ms sample interval; last 18,000 active samples; resets on car/build change',samples:samples.map(s=>({...s}))}; },
    close() { return new Promise(resolve => { listening = false; try { socket.close(resolve); } catch { resolve(); } }); },
  };
}
