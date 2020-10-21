/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

const debugEnabled = false;
const zonesActiveOnHomey = [];

class Device extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Zone-Motion: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are uses
    zonesActiveOnHomey.push(this.getDeviceId());

    eventBus.publish('zonetatuspolltrue', true);

    eventBus.subcribe('zonestatus', payload => {
      this.zoneStatus(payload);
    });
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async zoneStatus(payload) {
    payload = payload.slice(1);
    if (debugEnabled) {
      this.log('Reading zonestatus');
    }
    // const activeZonesOutputPartitions = [];
    let p = 0;
    for (const plist of payload) {
      const binarray = Array.from(functions.hex2bin(plist));
      for (let i = binarray.length - 1; i >= 0; --i) {
        p++;
        // this.log(zonesActiveOnHomey);
        if (zonesActiveOnHomey.indexOf(p) == -1) {
          // this.log(`SKIPPING: ${p}`);
          continue;
        }
        this.log(`Currently on zone:  ${p}`);
        if (binarray[i] == 1) {
          // if P  is in array deviceonhomey then .......
          // activeZonesOutputPartitions.push(p);
          // const arrayMatch = functions.getArrayMatch(activeZonesOutputPartitions, devicesOnHomey);
          // arrayMatch.forEach(zone => {
          this.log(`Active Zone:  ${p.toString()}`);
          const driver = Homey.ManagerDrivers.getDriver('zonesmotion');
          const deviceNameId = driver.getDevice({ id: p.toString() });
          deviceNameId.setCapabilityValue('alarm_motion', true);
          //  });
        } else if (binarray[i] == 0) {
          // const result = activeZonesOutputPartitions.filter(item => devicesOnHomey.indexOf(item) == -1);
          // result.forEach(zone => {
          this.log(`NON Active Zone:  ${p.toString()}`);
          const driver = Homey.ManagerDrivers.getDriver('zonesmotion');
          const deviceNameId = driver.getDevice({ id: p.toString() });
          deviceNameId.setCapabilityValue('alarm_motion', false);
          // });
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
