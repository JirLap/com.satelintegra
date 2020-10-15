/* eslint-disable eqeqeq */
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

let satelSocket = {};
let SatelSocketConnectionAlive = false;
let totalZoneOutputPartitions = [];
let alarmIdentified = false;
let firstSystemRead = false;

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

    // Start te socket and reconnect
    this.socketConnection();
    this.socketConnectorPoll();

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

  async socketConnectorPoll() {
    setInterval(() => {
      if (!SatelSocketConnectionAlive) {
        this.socketConnection(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'));
        this.log(`Trying to reconnect to alarmpanel: ${Homey.ManagerSettings.get('alarmaddr')}`);
      }
    }, 10000);
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
    satelSocket.setTimeout(15000);
    satelSocket.connect(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'), () => {
    });

    // socket timeout
    satelSocket.on('timeout', () => {
      this.log('Connection timed out.');
      SatelSocketConnectionAlive = false;
    });

    // socket connect
    satelSocket.on('connect', () => {
      this.log(`Connected with alarmpanel on IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      SatelSocketConnectionAlive = true;
      if (!firstSystemRead) {
        this.satelSystemRead();
      }
    });

    // socket close
    satelSocket.on('close', () => {
      this.log(`Connection closed to alarmpanel on IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      SatelSocketConnectionAlive = false;
    });

    // socket error
    satelSocket.on('error', err => {
      this.log(`Error:${err}`);
      SatelSocketConnectionAlive = false;
      satelSocket.destroy();
    });

    // socket data
    satelSocket.on('data', data => {
      const answer = functions.ETHM1AnswerToArray(data);
      const payload = answer.slice(2, -4);
      if (debugEnabled) {
        this.log(' * Received data from alarmpanel...');

        if (functions.verifyAnswer(answer)) {
          if (debugEnabled) {
            this.log(`   - valid answer: ${payload}`);
          }
        } else if (debugEnabled) {
          this.log(`   - incorrect answer:${payload}`);
        }
      }
      switch (payload[0]) {
        case '7E':
          this.log('Reading systemtype');
          this.parsePayloadSystemType(payload);
          break;
        case 'EE':
          if (payload[1] == '00') {
            // send partiotion info to partitions driver
            eventBus.publish('partitions', payload);
          } else if (payload[1] == '01') {
            // send partiotion info to all zone drivers
            eventBus.publish('zones', payload);
          } else if (payload[1] == '04') {
            // send partition info to output driver
            eventBus.publish('outputs', payload);
          }
          break;
        case '0A':
          // send partitionsstatus to partition device
          this.log('Reading partitionsstatus');
          eventBus.publish('partitionstatus', payload);
          // this.log(functions.partitionListToByteArray(payload.slice(1)));
          break;
        case '13':
          // send partitionsalarms to partition device
          this.log('Reading partitionsalarm');
          eventBus.publish('partitionalarm', payload);
          // this.log(functions.partitionListToByteArray(payload.slice(1)));
          break;
        case '00':
          // send zonestatus to all zone devices
          this.log('Reading zonestatus');
          eventBus.publish('zonestatus', payload);
          // this.log(functions.partitionListToByteArray(payload.slice(1)));
          break;
        case '17':
          // send outputstatus to output device
          this.log('Reading outputstatus');
          eventBus.publish('outputtatus', payload);
          // this.log(functions.partitionListToByteArray(payload.slice(1)));
          break;
        default:
          if (debugEnabled) {
            this.log('UNKOWN DATA RECEIVED');
          }
      }
    });
  }

  async satelSystemRead() {
    if (SatelSocketConnectionAlive) {
      firstSystemRead = true;
      // Send command to read the systemtype.
      this.socketSend(functions.createFrameArray(['7E']));
      setTimeout(() => {
        if (alarmIdentified) {
          for (let totalPartitionsCount = 1; totalPartitionsCount <= totalZoneOutputPartitions[2]; totalPartitionsCount++) {
            setTimeout(() => {
              // send commands for partitions
              if (debugEnabled) {
                this.log(`Reading partitionnumber : ${totalPartitionsCount}`);
              }
              this.socketSend(functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]));
            }, totalPartitionsCount * 100);
          }

          for (let totalOutputCount = 1; totalOutputCount <= totalZoneOutputPartitions[1]; totalOutputCount++) {
            setTimeout(() => {
              // send commands for outputs
              if (debugEnabled) {
                this.log(`Reading outputnumber : ${totalOutputCount}`);
              }
              this.socketSend(functions.createFrameArray(['EE', '04', `${functions.dec2hex2Digit(totalOutputCount)}`]));
            }, totalOutputCount * 100);
          }
          for (let totalZonesCount = 1; totalZonesCount <= totalZoneOutputPartitions[0]; totalZonesCount++) {
            setTimeout(() => {
              // send commands for zones
              if (debugEnabled) {
                this.log(`Reading zones : ${totalZonesCount}`);
              }
              this.socketSend(functions.createFrameArray(['EE', '01', `${functions.dec2hex2Digit(totalZonesCount)}`]));
            }, totalZonesCount * 100);
          }
        }
      }, 1000);
      this.satelSystemPartitionStatus();
      this.satelSystemPartitionAlarm();
      this.satelSystemZoneStatus();
      this.satelSystemOutputStatus();
    }
  }

  async satelSystemPartitionStatus() {
    setInterval(() => {
      // send command for zone violation
      this.socketSend(functions.createFrameArray(['0A']));
    }, 1500);
  }

  async satelSystemPartitionAlarm() {
    setInterval(() => {
      // send command for zone violation
      this.socketSend(functions.createFrameArray(['13']));
    }, 1500);
  }

  async satelSystemZoneStatus() {
    setInterval(() => {
      // send command for zone violation
      this.socketSend(functions.createFrameArray(['00']));
    }, 1500);
  }

  async satelSystemOutputStatus() {
    setInterval(() => {
      // send command for zone violation
      this.socketSend(functions.createFrameArray(['17']));
    }, 1500);
  }

  // parse data to identyfy alarmpanel
  async parsePayloadSystemType(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
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
      case 132:
        this.log('type = Integra 128-WRL LEON');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      default: this.log('UNKNOWN Alarm type');
    }
    return [];
  }

}

module.exports = integraAlarm;
