/* eslint-disable no-unused-vars */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const { ManagerSettings } = require('homey');
const functions = require('../../functions/functions');

class integraAlarmDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('integraAlarmDriver has been initialized');
    ManagerSettings.on('set', data => {
      this.log('-------------------------------------------------------');
      this.log('Setting are changed');
      this.log(`IP Address:   ${ManagerSettings.get('alarmaddr')}`);
      this.log(`Port: ${ManagerSettings.get('alarmport')}`);
      this.log(`Usercode:  ${ManagerSettings.get('alarmcode')}`);
      this.log(`Polling interval:  ${ManagerSettings.get('alarmpoll')} ms`);
      this.log('-------------------------------------------------------');
    });
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

}

module.exports = integraAlarmDriver;
