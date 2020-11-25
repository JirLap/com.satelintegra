/* eslint-disable eqeqeq */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const net = require('net');
const eventBus = require('@tuxjs/eventbus');
const functions = require('./js/functions');

const debugEnabled = false;

let satelSocket = {};
let SatelSocketConnectionAlive = false;
let totalZoneOutputPartitions = [];
let alarmIdentified = false;
let zoneStatusEnable = false;
let outputStatusEnable = false;
let partitionStatusEnable = false;
let partitionAlarmStatusEnable = false;
let statuspollers = true;

class integraAlarm extends Homey.App {

  async onInit() {
    this.log('-------------------------------------------------------');
    this.log(`${this.id} APP is running...`);
    this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
    this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
    this.log('-------------------------------------------------------');

    // Start te socket and reconnect
    this.socketConnection();
    this.socketConnectorPoll();

    // If devices are init start statuspolling
    eventBus.subcribe('zonestatuspolltrue', data => {
      if (data) {
        this.satelSystemZoneStatus();
      }
    });

    eventBus.subcribe('outputstatuspolltrue', data => {
      if (data) {
        this.satelSystemOuputstatus();
      }
    });

    eventBus.subcribe('partitionstatuspolltrue', data => {
      if (data) {
        this.satelSystemPartitionStatus();
        this.satelSystemPartitionAlarms();
      }
    });

    // Incoming data when devices are turned on/off
    eventBus.subcribe('satelSend', input => {
      this.socketSend(input);
    });

    // when settings are changed reset the socket
    Homey.ManagerSettings.on('set', data => {
      if (data === 'alarmaddr' || data === 'alarmport') {
        this.log('Settings are changed');
        satelSocket.destroy();
        SatelSocketConnectionAlive = false;
        this.log('-------------------------------------------------------');
        this.log('NEW SETTINGS');
        this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
        this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
        this.log('-------------------------------------------------------');
      } else if (data === 'systemstate') {
        const systemRead = Homey.ManagerSettings.get('systemstate');
        if (systemRead) {
          this.log('Reading system state.');
          statuspollers = false;
          this.satelSystemRead();
        } else {
          statuspollers = true;
        }
      }
    });
  }

  // socket poller/reconnect
  async socketConnectorPoll() {
    setInterval(() => {
      if (!SatelSocketConnectionAlive && Homey.ManagerSettings.get('alarmaddr') != null) {
        this.socketConnection(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'));
        this.log(`Trying to reconnect to alarmpanel: ${Homey.ManagerSettings.get('alarmaddr')}`);
      }
    }, 500);
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
    // satelSocket.setTimeout(4000);
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
      if (functions.verifyAnswer(answer)) {
        if (debugEnabled) {
          this.log(`   - valid answer: ${payload}`);
        }
        switch (payload[0]) {
          case '7E':
            this.parsePayloadSystemType(payload);
            break;
          case 'EE': // systaemstate
            if (payload[1] == '00') {
              // send partiotion info to partitions driver
              eventBus.publish('partitions', payload);
            } else if (payload[1] == '01') {
              // send zones info to all zone drivers
              eventBus.publish('zones', payload);
            } else if (payload[1] == '04') {
              // send output info to output driver
              eventBus.publish('outputs', payload);
            }
            break;
          case '0A':
            // send partitionsstatus to partition device
            eventBus.publish('partitionstatus', payload);
            break;
          case '13':
            // send partitionsalarms to partition device
            eventBus.publish('partitionalarm', payload);
            break;
          case '00':
            // send zonestatus to all zone devices
            eventBus.publish('zonestatus', payload);
            break;
          case '17':
            // send outputstatus to output device
            eventBus.publish('outputstatus', payload);
            break;
          default:
            if (debugEnabled) {
              this.log('UNKOWN DATA RECEIVED');
            }
        }
      } else if (debugEnabled) {
        this.log(`   - incorrect answer:${payload}`);
      }
    });
  }

  async satelSystemRead() {
    if (SatelSocketConnectionAlive) {
      // Send command to read the systemtype.
      this.socketSend(functions.createFrameArray(['7E']));
    }
    setTimeout(() => {
      if (alarmIdentified) {
        this.zoneRead();
        this.outputRead();
        this.partitionRead();
      }
    }, 2000);
  }

  // reading of zones
  async zoneRead() {
    this.log('Reading zones');
    for (let totalZonesCount = 1; totalZonesCount <= totalZoneOutputPartitions[0]; totalZonesCount++) {
      setTimeout(() => {
        // send commands for readout zones
        if (debugEnabled) {
          this.log(`Reading zonenumber : ${totalZonesCount}`);
        }
        this.socketSend(functions.createFrameArray(['EE', '01', `${functions.dec2hex2Digit(totalZonesCount)}`]));
      }, totalZonesCount * 1000);
    }
  }

  // reading of outputs
  async outputRead() {
    this.log('Reading outputs');
    for (let totalOutputCount = 1; totalOutputCount <= totalZoneOutputPartitions[1]; totalOutputCount++) {
      setTimeout(() => {
        // send commands for readout outputs
        if (debugEnabled) {
          this.log(`Reading outputnumber : ${totalOutputCount}`);
        }
        this.socketSend(functions.createFrameArray(['EE', '04', `${functions.dec2hex2Digit(totalOutputCount)}`]));
      }, totalOutputCount * 1000);
    }
  }

  // reading of partitions.
  async partitionRead() {
    this.log('Reading partitions');
    for (let totalPartitionsCount = 1; totalPartitionsCount <= totalZoneOutputPartitions[2]; totalPartitionsCount++) {
      setTimeout(() => {
        // send commands for readout partitions
        if (debugEnabled) {
          this.log(`Reading partitionnumber : ${totalPartitionsCount}`);
        }
        this.socketSend(functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]));
      }, totalPartitionsCount * 1000);
    }
  }

  // socket poller for zonestatus
  async satelSystemZoneStatus() {
    if (!zoneStatusEnable) {
      zoneStatusEnable = true;
      this.log('Polling zones');
      setInterval(() => {
        if (statuspollers) {
          setTimeout(() => {
          // send command for zone violation
            this.socketSend(functions.createFrameArray(['00']));
          }, 1000);
        }
      }, 1000);
    }
  }

  // socket poller for outputstatus
  async satelSystemOuputstatus() {
    if (!outputStatusEnable) {
      outputStatusEnable = true;
      this.log('Polling outputs');
      setInterval(() => {
        if (statuspollers) {
          setTimeout(() => {
            // send command for output status
            this.socketSend(functions.createFrameArray(['17']));
          }, 1000);
        }
      }, 1000);
    }
  }

  // socket poller for partitionstatus
  async satelSystemPartitionStatus() {
    if (!partitionStatusEnable) {
      partitionStatusEnable = true;
      this.log('Polling partitions');
      setInterval(() => {
        if (statuspollers) {
          setTimeout(() => {
          // send command for partition status
            this.socketSend(functions.createFrameArray(['0A']));
          }, 1000);
        }
      }, 1000);
    }
  }

  // socket poller for partitionalarms
  async satelSystemPartitionAlarms() {
    if (!partitionAlarmStatusEnable) {
      partitionAlarmStatusEnable = true;
      this.log('Polling partitions alarms');
      setInterval(() => {
        if (statuspollers) {
          setTimeout(() => {
            // send command for partitionalarmss
            this.socketSend(functions.createFrameArray(['13']));
          }, 1000);
        }
      }, 1000);
    }
  }

  // parse data to identyfy alarmpanel
  async parsePayloadSystemType(payload) {
    if (!Array.isArray(payload)) {
      return '';
    }
    this.log('Reading systemtype');
    switch (functions.hex2dec(payload[1])) {
      case 0:
        this.log('type = Integra 24');
        Homey.ManagerSettings.set('alarmtype', 'Integra 24');
        Homey.ManagerSettings.set('alarmtypetotal', '48');
        totalZoneOutputPartitions = ['24', '20', '4'];
        alarmIdentified = true;
        break;
      case 1:
        this.log('type = Integra 32');
        Homey.ManagerSettings.set('alarmtype', 'Integra 32');
        Homey.ManagerSettings.set('alarmtypetotal', '80');
        totalZoneOutputPartitions = ['32', '32', '16'];
        alarmIdentified = true;
        break;
      case 2:
        this.log('type = Integra 64');
        Homey.ManagerSettings.set('alarmtype', 'Integra 64');
        Homey.ManagerSettings.set('alarmtypetotal', '160');
        totalZoneOutputPartitions = ['64', '64', '32'];
        alarmIdentified = true;
        break;
      case 3:
        this.log('type = Integra 128');
        Homey.ManagerSettings.set('alarmtype', 'Integra 128');
        Homey.ManagerSettings.set('alarmtypetotal', '288');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 4:
        this.log('type = Integra 128-WRL SIM300');
        Homey.ManagerSettings.set('alarmtype', ' Integra 128-WRL SIM300');
        Homey.ManagerSettings.set('alarmtypetotal', '288');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 66:
        this.log('type = Integra 64 PLUS');
        Homey.ManagerSettings.set('alarmtype', 'Integra 64 PLUS');
        Homey.ManagerSettings.set('alarmtypetotal', '160');
        totalZoneOutputPartitions = ['64', '64', '32'];
        alarmIdentified = true;
        break;
      case 67:
        this.log('type = Integra 128 PLUS');
        Homey.ManagerSettings.set('alarmtype', 'Integra 128 PLUS');
        Homey.ManagerSettings.set('alarmtypetotal', '288');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      case 132:
        this.log('type = Integra 128-WRL LEON');
        Homey.ManagerSettings.set('alarmtype', 'Integra 128-WRL LEON');
        Homey.ManagerSettings.set('alarmtypetotal', '288');
        totalZoneOutputPartitions = ['128', '128', '32'];
        alarmIdentified = true;
        break;
      default: this.log('UNKNOWN Alarm type');
    }
    return [];
  }

}

module.exports = integraAlarm;
