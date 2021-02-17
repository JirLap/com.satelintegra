/* eslint-disable linebreak-style */
/* eslint-disable eqeqeq */
/* eslint-disable max-len */
/* eslint-disable func-names */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */

'use strict';

const Homey = require('homey');
const net = require('net');
const eventBus = require('@tuxjs/eventbus');
const functions = require('./js/functions');

const debugEnabled = true;
const satelSocket = new net.Socket();

let satelSocketConnectionAlive = false;
let totalZoneOutputPartitions = [];
let alarmIdentified = false;
let zoneStatusEnable = false;
let outputStatusEnable = false;
let partitionStatusEnable = false;
let partitionAlarmStatusEnable = false;
let statuspollers = true;

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

class integraAlarm extends Homey.App {

  async onInit() {
    this.log('-------------------------------------------------------');
    this.log(`${this.id} APP is running...`);
    this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
    this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
    this.log('-------------------------------------------------------');

    // Start te socket and reconnect
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

    // Incoming device data when devices are turned on/off on GUI or FLOW
    eventBus.subcribe('satelSend', input => {
      this.socketSend(input);
    });

    // when settings are changed reset the socket
    Homey.ManagerSettings.on('set', data => {
      if (data === 'alarmaddr' || data === 'alarmport') {
        this.log('Settings are changed');
        satelSocket.destroy();
        satelSocketConnectionAlive = false;
        this.log('-------------------------------------------------------');
        this.log('NEW SETTINGS');
        this.log(`IP Address:  ${Homey.ManagerSettings.get('alarmaddr')}`);
        this.log(`      Port:  ${Homey.ManagerSettings.get('alarmport')}`);
        this.log('-------------------------------------------------------');
        // If user press the readpanel button in settings
      } else if (data === 'systemstate') {
        const systemRead = Homey.ManagerSettings.get('systemstate');
        if (systemRead) {
          statuspollers = false; // stop the socketpollers
          this.log(' * Reading system state.');
          this.satelSystemRead();
        } else {
          statuspollers = true; // start the socketpollers
        }
      }
    });
  }

  // socket poller/reconnect
  async socketConnectorPoll() {
    setInterval(() => {
      if (!satelSocketConnectionAlive && Homey.ManagerSettings.get('alarmaddr') != null) {
        this.socketConnection(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'));
        this.log(`Trying to connect to alarmpanel: ${Homey.ManagerSettings.get('alarmaddr')}`);
      }
    }, 2000);
  }

  // create the socket
  async socketConnection() {
    if (!satelSocketConnectionAlive) {
      satelSocket.setEncoding('binary');
      // satelSocket.setTimeout(4000);
      satelSocket.connect(Number(Homey.ManagerSettings.get('alarmport')), Homey.ManagerSettings.get('alarmaddr'));
    }
    // socket timeout
    satelSocket.on('timeout', () => {
      this.log('Connection timed out.');
      satelSocketConnectionAlive = false;
    });

    // socket connect
    satelSocket.on('connect', () => {
      this.log(`Connected with alarmpanel on IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      satelSocketConnectionAlive = true;
    });

    // socket close
    satelSocket.on('close', () => {
      this.log(`Connection closed to alarmpanel on IP: ${Homey.ManagerSettings.get('alarmaddr')}`);
      satelSocketConnectionAlive = false;
    });

    // socket error
    satelSocket.on('error', err => {
      this.log(`Error:${err}`);
      satelSocketConnectionAlive = false;
      satelSocket.destroy();
    });
  }

  // systemread this function is called when user press the readpanel button on the settingspage.
  async satelSystemRead() {
    if (!satelSocketConnectionAlive) return;

    this.log(' * Reading systemtype');

    const data = await new Promise((resolve, reject) => {
      const input = functions.createFrameArray(['7E']);
      // send commands for readout systemtype
      satelSocket.write(Buffer.from(input.join(''), 'hex'));
      satelSocket.once('data', data => {
        resolve(data);
      }).on('error', error => {
        reject(error);
      });
    });

    const payload = functions.ETHM1AnswerToArray(data).slice(2, -4);
    if (debugEnabled) {
      this.log(` * Answer: ${payload}`);
    }
    if (payload[0] == '7E') {
      this.log(' * Reading systemtype');
      switch (functions.hex2dec(payload[1])) {
        case 0:
          this.log(' * ALARMTYPE = Integra 24');
          Homey.ManagerSettings.set('alarmtype', 'Integra 24');
          Homey.ManagerSettings.set('alarmtypetotal', '48');
          totalZoneOutputPartitions = ['24', '20', '4'];
          alarmIdentified = true;
          break;
        case 1:
          this.log(' * ALARMTYPE = Integra 32');
          Homey.ManagerSettings.set('alarmtype', 'Integra 32');
          Homey.ManagerSettings.set('alarmtypetotal', '80');
          totalZoneOutputPartitions = ['32', '32', '16'];
          alarmIdentified = true;
          break;
        case 2:
          this.log(' * ALARMTYPE = Integra 64');
          Homey.ManagerSettings.set('alarmtype', 'Integra 64');
          Homey.ManagerSettings.set('alarmtypetotal', '160');
          totalZoneOutputPartitions = ['64', '64', '32'];
          alarmIdentified = true;
          break;
        case 3:
          this.log(' * ALARMTYPE = Integra 128');
          Homey.ManagerSettings.set('alarmtype', 'Integra 128');
          Homey.ManagerSettings.set('alarmtypetotal', '288');
          totalZoneOutputPartitions = ['128', '128', '32'];
          alarmIdentified = true;
          break;
        case 4:
          this.log(' * ALARMTYPE = Integra 128-WRL SIM300');
          Homey.ManagerSettings.set('alarmtype', ' Integra 128-WRL SIM300');
          Homey.ManagerSettings.set('alarmtypetotal', '288');
          totalZoneOutputPartitions = ['128', '128', '32'];
          alarmIdentified = true;
          break;
        case 66:
          this.log(' * ALARMTYPE = Integra 64 PLUS');
          Homey.ManagerSettings.set('alarmtype', 'Integra 64 PLUS');
          Homey.ManagerSettings.set('alarmtypetotal', '160');
          totalZoneOutputPartitions = ['64', '64', '32'];
          alarmIdentified = true;
          break;
        case 67:
          this.log(' * ALARMTYPE = Integra 128 PLUS');
          Homey.ManagerSettings.set('alarmtype', 'Integra 128 PLUS');
          Homey.ManagerSettings.set('alarmtypetotal', '288');
          totalZoneOutputPartitions = ['128', '128', '32'];
          alarmIdentified = true;
          break;
        case 132:
          this.log(' * ALARMTYPE = Integra 128-WRL LEON');
          Homey.ManagerSettings.set('alarmtype', 'Integra 128-WRL LEON');
          Homey.ManagerSettings.set('alarmtypetotal', '288');
          totalZoneOutputPartitions = ['128', '128', '32'];
          alarmIdentified = true;
          break;
        default: this.log(' * UNKNOWN Alarm type');
      }
    }

    await delay(2000);

    if (alarmIdentified) {
      await this.zoneRead();
      await this.outputRead();
      // await this.partitionRead();
    }
  }

  async readingZonesOutputsPartitionsPayload(data) {
    const payload = functions.ETHM1AnswerToArray(data).slice(2, -4);
    if (debugEnabled) {
      this.log(` * Answer: ${payload}`);
    }
    switch (payload[1]) {
      case '01':
        // send the zones info to all zone drivers
        eventBus.publish('zones', payload);
        break;
      case '04':
        // send the outputs info to the output driver
        eventBus.publish('outputs', payload);
        break;
      case '00':
        // send the partition info to partitions driver
        eventBus.publish('partitions', payload);
        break;
      default: this.log(' * UNKNOWN ');
    }
  }

  // reading of zones
  async zoneRead() {
    if (!satelSocketConnectionAlive && !alarmIdentified) return;
    this.log(' * Reading zones');
    const data = await new Promise((resolve, reject) => {
      for (let totalZonesCount = 1; totalZonesCount <= totalZoneOutputPartitions[0]; totalZonesCount++) {
        setTimeout(() => {
          this.log(` * Reading zonenumber : ${totalZonesCount}`);
          const input = functions.createFrameArray(['EE', '01', `${functions.dec2hex2Digit(totalZonesCount)}`]);
          // send commands for readout zones
          satelSocket.write(Buffer.from(input.join(''), 'hex'));
          satelSocket.once('data', data => {
            this.readingZonesOutputsPartitionsPayload(data);
            resolve(data);
          }).on('error', error => {
            reject(error);
            this.log(error);
          });
        }, totalZonesCount * 1000);
      }
    });
  }

  // reading of outputs
  async outputRead() {
    if (!satelSocketConnectionAlive && !alarmIdentified) return;
    this.log(' * Reading outputs');
    const data = await new Promise((resolve, reject) => {
      for (let totalOutputCount = 1; totalOutputCount <= totalZoneOutputPartitions[1]; totalOutputCount++) {
        setTimeout(() => {
          this.log(` * Reading outputnumber : ${totalOutputCount}`);
          const input = functions.createFrameArray(['EE', '04', `${functions.dec2hex2Digit(totalOutputCount)}`]);
          // send commands for readout zones
          satelSocket.write(Buffer.from(input.join(''), 'hex'));
          satelSocket.once('data', data => {
            this.readingZonesOutputsPartitionsPayload(data);
            resolve(data);
          }).on('error', error => {
            reject(error);
          });
        }, totalOutputCount * 1000);
      }
    });
  }

  // reading of partitions
  async partitionRead() {
    if (!satelSocketConnectionAlive && !alarmIdentified) return;
    this.log(' * Reading partitions');
    const data = await new Promise((resolve, reject) => {
      for (let totalPartitionsCount = 1; totalPartitionsCount <= totalZoneOutputPartitions[2]; totalPartitionsCount++) {
        setTimeout(() => {
          this.log(` * Reading partitionnumber : ${totalPartitionsCount}`);
          const input = functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]);
          // send commands for readout partitions
          satelSocket.write(Buffer.from(input.join(''), 'hex'));
          satelSocket.once('data', data => {
            this.readingZonesOutputsPartitionsPayload(data);
            resolve(data);
          }).on('error', error => {
            reject(error);
          });
        }, totalPartitionsCount * 1000);
      }
    });
  }

  // socket poller for zonestatus
  async satelSystemZoneStatus() {
    if (!zoneStatusEnable) {
      zoneStatusEnable = true;
      this.log(' * Polling zones');
      setInterval(() => {
        if (statuspollers) {
          // send command for zone violation
          this.socketSend(functions.createFrameArray(['00']), data => {
            if (data[0] == '00') {
              eventBus.publish('zonestatus', data); // to zonedevice
            }
          });
        }
      }, 1000);
    }
  }

  // socket poller for outputstatus
  async satelSystemOuputstatus() {
    if (!outputStatusEnable) {
      outputStatusEnable = true;
      this.log(' * Polling outputs');
      setInterval(() => {
        if (statuspollers) {
          // send command for output status
          this.socketSend(functions.createFrameArray(['17']), data => {
            if (data[0] == '17') {
              eventBus.publish('outputstatus', data); // to outputdevice
            }
          });
        }
      }, 1000);
    }
  }

  // socket poller for partitionstatus
  async satelSystemPartitionStatus() {
    if (!partitionStatusEnable) {
      partitionStatusEnable = true;
      this.log(' * Polling partitions');
      setInterval(() => {
        if (statuspollers) {
          // send command for partition status
          this.socketSend(functions.createFrameArray(['0A']), data => {
            if (data[0] == '0A') {
              eventBus.publish('partitionstatus', data); // to partitiondevice
            }
          });
        }
      }, 1000);
    }
  }

  // socket poller for partitionalarms
  async satelSystemPartitionAlarms() {
    if (!partitionAlarmStatusEnable) {
      partitionAlarmStatusEnable = true;
      this.log(' * Polling partitions alarms');
      setInterval(() => {
        if (statuspollers) {
          // send command for partitionalarms
          this.socketSend(functions.createFrameArray(['13']), data => {
            if (data[0] == '13') {
              eventBus.publish('partitionalarm', data); // to partitiondevice
            }
          });
        }
      }, 1000);
    }
  }

}

module.exports = integraAlarm;
