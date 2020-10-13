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
    // Start the socket
    this.socketConnector();
  }

  async socketConnector() {
    const socketTimerConnector = setInterval(() => {
      if (!SatelSocketConnectionAlive) {
        this.socketConnection(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr')); 
        this.log(`Trying to connect to alarmpanel: ${Homey.ManagerSettings.get('alarmaddr')}`);
      }
    }, 10000);
  }

  // sendfunction for socket
  async sendCommand(input) {
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
        if (functions.verifyAnswer(answer)) {
          if (debugEnabled) {
            this.log(`   - valid answer: ${answer}`);
          }
        } else if (debugEnabled) {
          this.log(`   - incorrect answer:${answer}`);
        }
        eventBus.publish('data', answer);
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

  // this.sendCommand(functions.createFrameArray(['7E']));

}

module.exports = integraAlarm;
