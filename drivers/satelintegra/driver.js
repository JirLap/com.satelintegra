/* eslint-disable no-unused-vars */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const net = require('net');
const { ManagerSettings } = require('homey');
const functions = require('../../functions/functions');

const debugEnabled = true;

let satelSocket = {};
const devices = [];
let totalZones = 0;
let totalOutputs = 0;
let totalPartitions = 0;
let alarmIdentified = false;

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
      this.log(`      IP Address:  ${ManagerSettings.get('alarmaddr')}`);
      this.log(`            Port:  ${ManagerSettings.get('alarmport')}`);
      this.log(`        Usercode:  ${ManagerSettings.get('alarmcode')}`);
      this.log('-------------------------------------------------------');
    });
  }

  async createSocket(){
    satelSocket = new net.Socket();
    satelSocket.setTimeout(5000);
    satelSocket.connect(Number(ManagerSettings.get('alarmport')), ManagerSettings.get('alarmaddr'), () => {
        this.log(`Connected with alarmsystem on IP: ${ManagerSettings.get('alarmaddr')}`);
    });
  }

  // create the socket
  async socketConnection(input, callback) {

    satelSocket.write(Buffer.from(input.join(''), 'hex'));
    if (debugEnabled) {
      this.log(` * Send command: ${input.join('').match(/.{2}/g)}`);
    }

    // socket timeout
    satelSocket.on('timeout', () => {
        this.log('Connection timed out.');
      return [];
    });

    // socket close
    satelSocket.on('close', () => {
        this.log(`Connection closed to IP: ${ManagerSettings.get('alarmaddr')}`);
    });

    // socket error
    satelSocket.on('error', err => {
        this.log(`Error:${err}`);
      satelSocket.destroy();
      return [];
    });

    satelSocket.on('data', data => {
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
      // call the callback function with the payload as parameter
      callback(payload);
    });
  }

  async parsePayloadSystemType(payload) {
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
            totalPartitions = 4;
            alarmIdentified = true;
            break;
          case 1:
            this.log('type = Integra 32');
            totalZones = 32;
            totalOutputs = 32;
            totalPartitions = 16;
            alarmIdentified = true;
            break;
          case 2:
            this.log('type = Integra 64');
            totalZones = 64;
            totalOutputs = 64;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 3:
            this.log('type = Integra 128');
            totalZones = 128;
            totalOutputs = 128;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 4:
            this.log('type = Integra 128-WRL SIM300');
            totalZones = 128;
            totalOutputs = 128;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 66:
            this.log('type = Integra 64 PLUS');
            totalZones = 64;
            totalOutputs = 64;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 67:
            this.log('type = Integra 128 PLUS');
            totalZones = 128;
            totalOutputs = 128;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 72:
            this.log('type = Integra 256 PLUS');
            totalZones = 256;
            totalOutputs = 256;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          case 132:
            this.log('type = Integra 128-WRL LEON');
            totalZones = 128;
            totalOutputs = 128;
            totalPartitions = 32;
            alarmIdentified = true;
            break;
          default: this.log('UNKNOWN Alarm type');
        }
        break;
      default: this.log('UNKNOWN Alarm type');
    }
    return payload;
  } // parsePayloadSystemType

  // parsePayloadPartitions
  async parsePayloadPartition(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }

    const cmd = payload[0];
    const answer = payload.slice(1);
    const partitionNumber = payload.slice(2, 3);
    const partitionName = payload.slice(4, 20);
    if (cmd === 'EF') {
      this.log('   - PARTITION NOT USED');
    } else {
      if (debugEnabled) {
        this.log(`   - command: ${cmd}`);
        this.log(`   - answer : ${answer}`);
      }
      this.log(`   - Partitionnumber : ${functions.hex2dec(partitionNumber)}`);
      this.log(`   - Partitionname   : ${functions.hex2a(partitionName)}`);
      const device = [{
        name: `${functions.hex2a(partitionName)}`,
        data: {
          id: `P${functions.hex2dec(partitionNumber)}`,
        },
        capabilities: ['onoff'],
      },
      ];
      devices.push(device);
    }
    return payload;
  } // parsePayloadPartitions

  async parsePayloadOutput(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
    const cmd = payload[0];
    const answer = payload.slice(1);
    const outputNumber = payload.slice(2, 3);
    const outputFunction = payload.slice(3, 4);
    const outputName = payload.slice(4, 20);
    if (outputFunction == '00') {
      this.log('   - OUTPUT NOT USED');
    } else {
      if (debugEnabled) {
        this.log(`   - command: ${cmd}`);
        this.log(`   - answer : ${answer}`);
      }
      this.log(`   - Outputnumber   : ${functions.hex2dec(outputNumber)}`);
      this.log(`   - Outputsname    : ${functions.hex2a(outputName)}`);
      this.log(`   - Outputfunction : ${functions.hex2dec(outputFunction)}`);
      const device = [{
        name: `${functions.hex2a(outputName)}`,
        data: {
          id: `O${functions.hex2dec(outputNumber)}`,
        },
        capabilities: ['onoff'],
      },
      ];
      devices.push(device);
    }
    return payload;
  } // parsePayloadPartitions

  async parsePayloadZones(payload) {
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
      this.log(`   - Zonenumber     : ${functions.hex2dec(zoneNumber)}`);
      this.log(`   - Zonename       : ${functions.hex2a(zoneName)}`);
      this.log(`   - Zonefunction   : ${functions.hex2dec(zoneFunction)}`);
    }
    return payload;
  } // parsePayloadZones

  async onPair(socket) {
    // send command for system type
    this.createSocket();
    this.log('Reading systemtype');
    this.socketConnection(functions.createFrameArray(['7E']), systemType => {
       this.parsePayloadSystemType(systemType); 
       alarmIdentified = true;
    });
    socket.on('showView', (viewId, callbackShow) => {
      callbackShow();
      if (viewId === 'startpartition') {
        if (!alarmIdentified) {
          socket.emit('errors', 'Alarmpanel type not found. Check IP, Port or alarmpanel settings', (err, data) => {
          });
        } else if (alarmIdentified) {
          // send command for partitions
          this.log('Reading partitions');
          for (let totalPartitionsCount = 1; totalPartitionsCount <= totalPartitions; totalPartitionsCount++) {
              this.log(`Reading partitionnumber : ${totalPartitionsCount}`);
                  this.socketConnection(functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]), partitions => {
                  this.parsePayloadPartition(partitions);
                });
          }
        
          socket.emit('continue', null);
          socket.on('list_devices', (data, callback) => {
            callback(null, devices);
          });
        } else {
          socket.emit('errors', 'Something went wrong. Try again.', (err, data) => {
          });
        }
      }
    });
  }

}

module.exports = integraAlarmDriver;
/*
 // send command for zones
 this.log('Reading zones');
 for (let totalZonesCount = 1; totalZonesCount <= totalZones; totalZonesCount++) {
   setTimeout(() => {
     this.log(`Reading zonenumber : ${totalZonesCount}`);
     this.socketConnection(functions.createFrameArray(['EE', '01', `${functions.dec2hex2Digit(totalZonesCount)}`]), zones => {
       this.parsePayloadZones(zones);
     });
   }, totalZonesCount * 950);
 }

 // send command for outputs
 this.log('Reading outputs');
 for (let totalOutputsCount = 1; totalOutputsCount <= totalOutputs; totalOutputsCount++) {
   setTimeout(() => {
     this.log(`Reading outputnumber : ${totalOutputsCount}`);
     this.socketConnection(functions.createFrameArray(['EE', '04', `${functions.dec2hex2Digit(totalOutputsCount)}`]), outputs => {
       this.parsePayloadOutput(outputs);
     });
   }, totalOutputsCount * 950);
 }
 */
