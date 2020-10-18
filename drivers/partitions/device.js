/* eslint-disable eqeqeq */

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
    }
    const activepartitions = [];
    let p = 0;
    for (const plist of payload) {
      const binarray = Array.from(functions.hex2bin(plist));
      for (let i = binarray.length - 1; i >= 0; --i) {
        p++;
        if (binarray[i] == 1) {
          activepartitions.push(p);
          this.log(` - active partitions (now)   : ${activepartitions}`);
        }
      }
    }
  }

  async partitionAlarms(payload) {
    payload = payload.slice(1);
    if (debugEnabled) {
      this.log('Reading partitionsalarm');
      // this.log(functions.hex2bin(payload));
    }
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
