/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const devices = [];

class satelZonesFireDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('   Driver has been initialized');

    eventBus.subcribe('zones', payload => {
      if (!Array.isArray(payload)) {
        return '';
      }
      const zoneNumber = payload.slice(2, 3);
      const zoneFunction = payload.slice(3, 4);
      const zoneName = payload.slice(4, 20);
      this.log('    -----------------------------------------------------');
      this.log(`    - Zonenumber     : ${functions.hex2dec(zoneNumber)}`);
      this.log(`    - Zonename       : ${functions.hex2a(zoneName)}`);
      this.log(`    - Zonefunction   : ${functions.hex2dec(zoneFunction)}`);
      this.log('    -----------------------------------------------------');

      const device = {
        name: `${functions.hex2a(zoneName)}`,
        data: {
          id: `${functions.hex2dec(payload[2])}`,
        },
        capabilities: ['alarm_fire'],
        icon: 'icon.svg',
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

module.exports = satelZonesFireDriver;
