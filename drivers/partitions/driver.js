/* eslint-disable consistent-return */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const devices = [];

class Driver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('  Driver has been initialized');

    eventBus.subcribe('partitions', payload => {
      if (!Array.isArray(payload)) {
        return '';
      }
      const partitionNumber = payload.slice(2, 3);
      const partitionName = payload.slice(4, 20);
      this.log('   -----------------------------------------------------');
      this.log(`   - Partitionnumber : ${functions.hex2dec(partitionNumber)}`);
      this.log(`   - Partitionname   : ${functions.hex2a(partitionName)}`);
      this.log('   -----------------------------------------------------');
      const device = {
        name: `${functions.hex2a(partitionName)}`,
        data: {
          id: `${functions.hex2dec(partitionNumber)}`,
        },
      };
      devices.push(device);
    });
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices(data, callback) {
    callback(null, devices);
  }

}

module.exports = Driver;
