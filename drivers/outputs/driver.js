/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const devices = [];

class satelOutputsDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('   Driver has been initialized');

    eventBus.subcribe('outputs', payload => {
      if (!Array.isArray(payload)) {
        return '';
      }
      const outputNumber = payload.slice(2, 3);
      const outputFunction = payload.slice(3, 4);
      const outputName = payload.slice(4, 20);
      if (outputFunction == '00') {
        this.log('      -----------------------------------------------------');
        this.log(`      - Outputnumber   : ${functions.hex2dec(outputNumber)}`);
        this.log('      - OUTPUT NOT USED');
        this.log('      -----------------------------------------------------');
      } else {
        this.log('      -----------------------------------------------------');
        this.log(`      - Outputnumber   : ${functions.hex2dec(outputNumber)}`);
        this.log(`      - Outputsname    : ${functions.hex2a(outputName)}`);
        this.log(`      - Outputfunction : ${functions.hex2dec(outputFunction)}`);
        this.log('      -----------------------------------------------------');

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

module.exports = satelOutputsDriver;
