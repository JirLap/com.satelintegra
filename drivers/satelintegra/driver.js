/* eslint-disable no-unused-vars */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const net = require('net');
const { ManagerSettings } = require('homey');
const functions = require('../../functions/functions');

const debugEnabled = false;

let satelSocket = {};
let satelSocketConnected = false;
let totalZones = 0;
let totalOutputs = 0;

class integraAlarmDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('-------------------------------------------------------');
    this.log('integraAlarmDriver has been initialized');
    this.log('-------------------------------------------------------');
    ManagerSettings.on('set', data => {
      this.log('-------------------------------------------------------');
      this.log('Setting are changed');
      this.log(`IP Address:   ${ManagerSettings.get('alarmaddr')}`);
      this.log(`Port: ${ManagerSettings.get('alarmport')}`);
      this.log(`Usercode:  ${ManagerSettings.get('alarmcode')}`);
      this.log(`Polling interval:  ${ManagerSettings.get('alarmpoll')} ms`);
      this.log('-------------------------------------------------------');
    });
  }

  // create the socket
  socketConnection(input, callback) {
    satelSocket = new net.Socket();
    satelSocket.setEncoding('binary');
    satelSocket.setTimeout(1000);

    satelSocket.connect(Number(ManagerSettings.get('alarmport')), ManagerSettings.get('alarmaddr'), () => {
      this.log(`Connected with alarmsystem on IP: ${ManagerSettings.get('alarmaddr')}`);
      satelSocketConnected = true;
      if (debugEnabled) {
        this.log(` * Send command: ${input.join('').match(/.{2}/g)}`);
      }
      satelSocket.write(Buffer.from(input.join(''), 'hex'));
    });

    // socket timeout
    satelSocket.on('timeout', () => {
      if (debugEnabled) {
        this.log('Connection timed out.');
      }
      satelSocket.destroy();
      satelSocket.end();
      return [];
    });

    // socket close
    satelSocket.on('close', () => {
      if (debugEnabled) {
        this.log(`Connection closed to IP: ${ManagerSettings.get('alarmaddr')}`);
      }
    });

    // socket error
    satelSocket.on('error', err => {
      if (debugEnabled) {
        this.log(`Error:${err}`);
      }
      satelSocket.destroy();
      return [];
    });

    satelSocket.on('data', async data => {
      if (debugEnabled) {
        this.log(' * Received data from alarm...');
      }
      const answer = functions.ETHM1AnswerToArray(data);
      if (functions.verifyAnswer(answer)) {
        if (debugEnabled) {
          this.log(`   - valid answer: ${answer}`);
        }
      } else if (debugEnabled) {
        this.log(`   - incorrect answer:${answer}`);
      }
      const payload = answer.slice(2, -4);
      if (debugEnabled) {
        this.log(`   - payload: ${payload}`);
      }
      satelSocket.destroy();
      // call the callback function with the payload as parameter
      callback(payload);
    });
  }

  parsePayloadSystemType(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }

    const cmd = payload[0];
    const answer = payload.slice(1);
    if (debugEnabled) {
      this.log(`   - command: ${cmd}`);
      this.log(`   - answer : ${answer}`);
    }
    switch (cmd) { // check payload field 1 to match command
      case '7E': // Integra version
        this.log('Checking systemtype');
        // 1 byte for the alarm type
        switch (functions.hex2dec(answer[0])) {
          case 0:
            this.log('type = Integra 24');
            totalZones = 24;
            totalOutputs = 20;
            break;
          case 1:
            this.log('type = Integra 32');
            totalZones = 32;
            totalOutputs = 32;
            break;
          case 2:
            this.log('type = Integra 64');
            totalZones = 64;
            totalOutputs = 64;
            break;
          case 3:
            this.log('type = Integra 128');
            totalZones = 128;
            totalOutputs = 128;
            break;
          case 4:
            this.log('type = Integra 128-WRL SIM300');
            totalZones = 128;
            totalOutputs = 128;
            break;
          case 66:
            this.log('type = Integra 64 PLUS');
            totalZones = 64;
            totalOutputs = 64;
            break;
          case 67:
            this.log('type = Integra 128 PLUS');
            totalZones = 128;
            totalOutputs = 128;
            break;
          case 72:
            this.log('type = Integra 256 PLUS');
            totalZones = 256;
            totalOutputs = 256;
            break;
          case 132:
            this.log('type = Integra 128-WRL LEON');
            totalZones = 128;
            totalOutputs = 128;
            break;
          default: this.log('UNKNOWN Alarm type');
        }
        break;
      default: this.log('UNKNOWN Alarm type');
    }
    return payload;
  } // parsePayloadSystemType

  parsePayloadZones(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }

    const cmd = payload[0];
    const answer = payload.slice(1);
    const zoneNumber = payload.slice(2, 3);
    const zoneFunction = payload.slice(3, 4);
    const zoneName = payload.slice(4, 20);
    if (cmd === 'EF') {
      this.log('   - ZONE NOT USED');
    } else {
      if (debugEnabled) {
        this.log(`   - command: ${cmd}`);
        this.log(`   - answer : ${answer}`);
      }
      this.log(`   - Zonenumber : ${functions.hex2dec(zoneNumber)}`);
      this.log(`   - Zonename   : ${functions.hex2a(zoneName)}`);
      this.log(`   - Zonefunction   : ${functions.hex2dec(zoneFunction)}`);
    }
    return payload;
  } // parsePayloadZones console.log(buf.toString('hex'));

  onPair(socket) {
    // send command for system type
    this.log('Reading systemtype');
    this.socketConnection(functions.createFrameArray(['7E']), systemType => {
      this.parsePayloadSystemType(systemType);
    });
    socket.on('showView', (viewId, callbackShow) => {
      callbackShow();
      if (viewId === 'start') {
        if (ManagerSettings.get('alarmaddr') === '0.0.0.0' || ManagerSettings.get('alarmaddr') === '127.0.0.1') {
          socket.emit('errors', 'Default or NO IP address, go to general settings to change.', (err, data) => {
          });
        } else if (satelSocketConnected) {
          // send command for zones and outputs
          this.log('Reading zones');
          for (let totalZonesCount = 1; totalZonesCount <= totalZones; totalZonesCount++) {
            setTimeout(() => {
              this.log(`Reading zonenumber : ${totalZonesCount}`);
              this.socketConnection(functions.createFrameArray(['EE', '01', `${functions.dec2hex2Digit(totalZonesCount)}`]), zones => {
                this.parsePayloadZones(zones);
              });
            }, totalZonesCount * 950);
          }

          // create the devices data property.
          const devices = [{
            name: 'Main Zone',
            data: {
              id: 'main',
            },
          },
          ];

          socket.emit('continue', null);
          socket.on('list_devices', (data, callback) => {
            callback(null, devices);
          });
        } else {
          socket.emit('errors', 'No response from alarmsystem, check IP or port', (err, data) => {
          });
        }
      }
    });
  }

}

module.exports = integraAlarmDriver;
