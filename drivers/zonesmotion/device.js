/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const debugEnabled = false;

class Device extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Zone-Motion: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are uses
    const zonesActiveOnHomey = [];
    zonesActiveOnHomey.push(this.getDeviceId());

    eventBus.publish('zonetatuspolltrue', true);

    eventBus.subcribe('zonestatus', payload => {
      this.zoneStatus(payload, zonesActiveOnHomey);
    });
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async zoneStatus(payload, devicesOnHomey) {
    payload = payload.slice(1);
    if (debugEnabled) {
      this.log('Reading zonestatus');
    }
    const activeZonesOutputPartitions = [];
    let p = 0;
    for (const plist of payload) {
      const binarray = Array.from(functions.hex2bin(plist));
      for (let i = binarray.length - 1; i >= 0; --i) {
        p++;
        if (binarray[i] == 1) {
          activeZonesOutputPartitions.push(p);
          const arrayMatch = functions.getArrayMatch(activeZonesOutputPartitions, devicesOnHomey);
          arrayMatch.forEach(zone => {
            this.log(`Active Zone:  ${arrayMatch}`);
            const driver = Homey.ManagerDrivers.getDriver('zonesmotion');
            const devicNameId = driver.getDevice({ id: zone.toString() });
            devicNameId.setCapabilityValue('alarm_motion', true);
          });
        } else if (binarray[i] == 0) {
          const result = activeZonesOutputPartitions.filter(item => devicesOnHomey.indexOf(item) == -1);
          result.forEach(zone => {
            this.log(`NON Active Zone:  ${zone}`);
            const driver = Homey.ManagerDrivers.getDriver('zonesmotion');
            const devicNameId = driver.getDevice({ id: zone.toString() });
            devicNameId.setCapabilityValue('alarm_motion', false);
          });
        }
      }
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
