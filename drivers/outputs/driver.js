/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const devices = [];

class satelPartitionsDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('---------------------------');
    this.log('Driver has been initialized');
    this.log('---------------------------');

    eventBus.subcribe('partitions', payload => {
      if (!Array.isArray(payload)) {
        return '';
      }
      const partitionName = payload.slice(4, 20);
      this.log('   -----------------------------------------------------}');
      this.log(`   - Partitionnumber : ${functions.hex2dec(payload[2])}`);
      this.log(`   - Partitionname   : ${functions.hex2a(partitionName)}`);
      this.log('   -----------------------------------------------------}');
      const device = {
        name: `${functions.hex2a(partitionName)}`,
        data: {
          id: `P${functions.hex2dec(payload[2])}`,
        },
        capabilities: ['onoff', 'alarm_generic'],
        icon: '/house.svg',
      };
      devices.push(device);
    });
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return devices;
  }

}

module.exports = satelPartitionsDriver;
