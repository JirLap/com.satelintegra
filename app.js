/* eslint-disable max-len */
/* eslint-disable no-unused-vars */

'use strict';

/*  EVentbus
EventBus.publish('event', 'hi');
EventBus.subcribe('event', value => {
  this.log(`value: ${value}`);
});
}
*/

const Homey = require('homey');
const net = require('net');
const eventBus = require('@tuxjs/eventbus');
const functions = require('./js/functions');

const debugEnabled = true;
const devices = [];

let satelSocket = {};
let SatelSocketConnectionAlive = false;
let totalZoneOutputPartitions = [];
let alarmIdentified = false;

class integraAlarm extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('-------------------------------------------------------');
    this.log(`${this.id} APP is running...`);
    this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
    this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
    this.log('-------------------------------------------------------');

    Homey.ManagerSettings.on('set', data => {
      this.log('Settings are changed');
      satelSocket.destroy();
      SatelSocketConnectionAlive = false;
      this.log('-------------------------------------------------------');
      this.log('NEW SETTINGS');
      this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
      this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
      this.log('-------------------------------------------------------');
    });
  }

  async satelSystemRead() {
    this.log(alarmIdentified);
    this.log(SatelSocketConnectionAlive);
    if (SatelSocketConnectionAlive) {
      // Send command to read the systemtype.
      this.socketSend(functions.createFrameArray(['7E']));
      // send commands for partitions
      if (alarmIdentified) {
        for (let totalPartitionsCount = 1; totalPartitionsCount <= totalZoneOutputPartitions[2]; totalPartitionsCount++) {
          this.log(`Reading partitionnumber : ${totalPartitionsCount}`);
          this.socketSend(functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]));
        }
      }
    }
  }

  async socketConnector() {
    const socketTimerConnector = setInterval(() => {
      if (!SatelSocketConnectionAlive) {
        this.socketConnection(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'));
        this.log(`Trying to connect to alarmpanel: ${Homey.ManagerSettings.get('alarmaddr')}`);
      }
    }, 1000);
    return null;
  }

  // sendfunction for socket
  async socketSend(input) {
    satelSocket.write(Buffer.from(input.join(''), 'hex'));
    if (debugEnabled) {
      this.log(` * Send command: ${input.join('').match(/.{2}/g)}`);
    }
  }

  // create the socket
  async socketConnection(settings) {
    satelSocket = new net.Socket();
    satelSocket.setTimeout(5000);
    satelSocket.connect(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'), () => {
    });

    // socket timeout
    satelSocket.on('timeout', () => {
      this.log('Connection timed out.');
      SatelSocketConnectionAlive = false;
      return [];
    });

    // socket connect
    satelSocket.on('connect', () => {
      this.log(`Connected with alarmsystem on IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      SatelSocketConnectionAlive = true;

      return [];
    });

    // socket close
    satelSocket.on('close', () => {
      this.log(`Connection closed to IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      SatelSocketConnectionAlive = false;
      return [];
    });

    // socket error
    satelSocket.on('error', err => {
      this.log(`Error:${err}`);
      SatelSocketConnectionAlive = false;
      satelSocket.destroy();
      return [];
    });

    // socket data
    satelSocket.on('data', data => {
      if (debugEnabled) {
        this.log(' * Received data from alarm...');
        const answer = functions.ETHM1AnswerToArray(data);
        const payload = answer.slice(2, -4);

        if (functions.verifyAnswer(answer)) {
          if (debugEnabled) {
            this.log(`   - valid answer: ${answer}`);
          }
        } else if (debugEnabled) {
          this.log(`   - incorrect answer:${answer}`);
        }

        switch (payload[0]) {
          case '7E':
            this.log('Reading systemtype');
            this.parsePayloadSystemType(payload);
            break;
          case 'EE':
            if (payload[1] == '00') {
              this.parsePayloadPartition(payload);
            }
            break;
          default: this.log('UNKOWN');
        }
      }
    });
  }

  async parsePayloadSystemType(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
    // const answer = payload.slice(1);
    switch (functions.hex2dec(payload[1])) {
      case 0:
        this.log('type = Integra 24');
        totalZoneOutputPartitions = ['24', '20', '4'];
        alarmIdentified = true;
        break;
      case 1:
        this.log('type = Integra 32');
        totalZoneOutputPartitions = ['32', '32', '16'];
        alarmIdentified = true;
        break;
      case 2:
        this.log('type = Integra 64');
        totalZoneOutputPartitions = ['64', '64', '32'];
        alarmIdentified = true;
        break;
      case 3:
        this.log('type = Integra 128');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 4:
        this.log('type = Integra 128-WRL SIM300');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 66:
        this.log('type = Integra 64 PLUS');
        totalZoneOutputPartitions = ['64', '64', '32'];
        alarmIdentified = true;
        break;
      case 67:
        this.log('type = Integra 128 PLUS');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 72:
        this.log('type = Integra 256 PLUS');
        totalZoneOutputPartitions = ['256', '256', '32'];
        alarmIdentified = true;
        break;
      case 132:
        this.log('type = Integra 128-WRL LEON');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
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
    const partitionName = payload.slice(4, 20);
    this.log(`   - Partitionnumber : ${functions.hex2dec(payload[2])}`);
    this.log(`   - Partitionname   : ${functions.hex2a(partitionName)}`);
    const device = {
      name: `${functions.hex2a(partitionName)}`,
      data: {
        id: `P${functions.hex2dec(payload[2])}`,
      },
      capabilities: ['onoff', 'alarm_generic'],
      icon: '/house.svg',
    };
    devices.push(device);
    return payload;
  } // parsePayloadPartitions

  async parsePayloadOutput(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
    const outputNumber = payload.slice(2, 3);
    const outputFunction = payload.slice(3, 4);
    const outputName = payload.slice(4, 20);
    if (outputFunction == '00') {
      this.log('   - OUTPUT NOT USED');
    } else {
      this.log(`   - Outputnumber   : ${functions.hex2dec(outputNumber)}`);
      this.log(`   - Outputsname    : ${functions.hex2a(outputName)}`);
      this.log(`   - Outputfunction : ${functions.hex2dec(outputFunction)}`);
      const device = {
        name: `${functions.hex2a(outputName)}`,
        data: {
          id: `O${functions.hex2dec(outputNumber)}`,
        },
        capabilities: ['onoff'],
        icon: '/alarm.svg',
      };
      devices.push(device);
    }
    return payload;
  } // parsePayloadPartitions

  async parsePayloadZones(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
    const cmd = payload[0];
    const zoneNumber = payload.slice(2, 3);
    const zoneFunction = payload.slice(3, 4);
    const zoneName = payload.slice(4, 20);
    if (cmd === 'EF') {
      this.log('   - ZONE NOT USED');
    } else {
      this.log(`   - Zonenumber     : ${functions.hex2dec(zoneNumber)}`);
      this.log(`   - Zonename       : ${functions.hex2a(zoneName)}`);
      this.log(`   - Zonefunction   : ${functions.hex2dec(zoneFunction)}`);
    }
    return payload;
  } // parsePayloadZones

      // Start the socket
      socketConnector();
      satelSystemRead();

}

module.exports = integraAlarm;
