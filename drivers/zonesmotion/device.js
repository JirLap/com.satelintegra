/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

let zonesActiveOnHomey = [];
let eventBusEnable = false;

class ZoneMotionDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Zone-Motion: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are uses
    zonesActiveOnHomey.push(this.getDeviceId());

    eventBus.publish('zonestatuspolltrue', true);

    // incoming zonestatus
    if (!eventBusEnable) {
      eventBus.subcribe('zonestatus', payload => {
        this.zoneStatus(payload);
      });
      eventBusEnable = true;
    }
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async zoneStatus(payload) {
    const driver = Homey.ManagerDrivers.getDriver('zonesmotion');
    payload = payload.slice(1);
    let zoneId = 0;
    for (const list of payload) {
      const binarray = Array.from(functions.hex2bin(list));
      for (let i = binarray.length - 1; i >= 0; --i) {
        zoneId++;
        if (zonesActiveOnHomey.indexOf(zoneId.toString()) === -1) {
          continue;
        }
        if (binarray[i] == 1) {
          this.log(`Active Zone:  ${zoneId}`);
          const deviceNameId = driver.getDevice({ id: zoneId.toString() });
          deviceNameId.setCapabilityValue('alarm_motion', true);
        } else {
          const deviceNameId = driver.getDevice({ id: zoneId.toString() });
          deviceNameId.setCapabilityValue('alarm_motion', false);
        }
      }
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
    zonesActiveOnHomey = zonesActiveOnHomey.filter(zoneId => zoneId !== this.getDeviceId());
  }

}

module.exports = ZoneMotionDevice;
