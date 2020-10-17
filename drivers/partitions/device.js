'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const debugEnabled = true;

class Device extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Partition: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    eventBus.publish('partitionstatuspolltrue', true);

    // incoming partitionstatus
    eventBus.subcribe('partitionstatus', payload => {
      this.partitionStatus(payload);
    });

    // incoming partitionsalarm
    eventBus.subcribe('partitionalarm', payload => {
      // this.partitionAlarms(payload);
    });
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async partitionStatus(payload) {
    payload = payload.slice(1);
    if (debugEnabled) {
      this.log('Reading partitionsstatus');

      const binarray = Array.from(functions.hex2bin(payload));
      this.log(binarray);
    }
  }

  async partitionAlarms(payload) {
    payload = payload.slice(1);
    if (debugEnabled) {
      this.log('Reading partitionsalarm');
      this.log(functions.hex2bin(payload));
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log(`Device ${this.getName()} has been added`);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Device settings where changed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log(`Device ${this.getName()} has been deleted`);
  }

}

module.exports = Device;
