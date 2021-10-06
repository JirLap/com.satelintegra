/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

let partitionsActiveOnHomey = [];
let eventBusEnable = false;

class PartitionDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Partition: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are uses
    partitionsActiveOnHomey.push(this.getDeviceId());
    const driver = Homey.ManagerDrivers.getDriver('partitions');
    const deviceNameId = driver.getDevice({ id: this.getDeviceId().toString() });
    deviceNameId.setCapabilityValue('onoff', false);

    eventBus.publish('partitionstatuspolltrue', true);

    // incoming partitionstatus
    if (!eventBusEnable) {
      eventBus.subcribe('partitionstatus', payload => {
        this.partitionStatus(payload);
      });
    }

    // incoming partitionsalarm
    if (!eventBusEnable) {
      eventBus.subcribe('partitionalarm', payload => {
        this.partitionAlarms(payload);
      });
      eventBusEnable = true;
    }

    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value, opts) {
    if (value) {
      this.log(`ARM Partition : ${this.getDeviceId()}`);
      eventBus.publish('satelSend', this.armDisAction('80', this.getDeviceId()));
    } else {
      eventBus.publish('satelSend', this.armDisAction('84', this.getDeviceId()));
    }
  }

  armDisAction(mode, deviceID) {
    let ary = [];
    // first byte is command code ()
    ary.push(mode);
    // next 8 bytes are usercode
    ary = ary.concat(functions.stringToHexBytes(Homey.ManagerSettings.get('alarmcode'), 8, 'F'));
    // next 4 bytes are partitions
    ary = ary.concat(functions.partitionListToByteArray(deviceID));
    return functions.createFrameArray(ary);
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async partitionStatus(payload) {
    const driver = Homey.ManagerDrivers.getDriver('partitions');
    payload = payload.slice(1);
    let partId = 0;
    for (const list of payload) {
      const binarray = Array.from(functions.hex2bin(list));
      for (let i = binarray.length - 1; i >= 0; --i) {
        partId++;
        if (partitionsActiveOnHomey.indexOf(partId.toString()) === -1) {
          continue;
        }
        if (binarray[i] == 1) {
          const deviceStatusPanel = [[partId], 'true'];
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          const deviceStatusHomey = deviceNameId.getCapabilityValue('onoff');
          if (deviceStatusHomey.toString() != deviceStatusPanel[1].toString()) {
            deviceNameId.setCapabilityValue('onoff', true);
            this.log(`Active Partition:  ${partId}`);
          }
        } else {
          const deviceStatusPanel = [[partId], 'false'];
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          const deviceStatusHomey = deviceNameId.getCapabilityValue('onoff');
          if (deviceStatusHomey.toString() != deviceStatusPanel[1].toString()) {
            deviceNameId.setCapabilityValue('onoff', false);
          }
        }
      }
    }
  }

  async partitionAlarms(payload) {
    const driver = Homey.ManagerDrivers.getDriver('partitions');
    payload = payload.slice(1);
    let partId = 0;
    for (const list of payload) {
      const binarray = Array.from(functions.hex2bin(list));
      for (let i = binarray.length - 1; i >= 0; --i) {
        partId++;
        if (partitionsActiveOnHomey.indexOf(partId.toString()) === -1) {
          continue;
        }
        if (binarray[i] == 1) {
          this.log(`Active Partition alarm:  ${partId}`);
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          deviceNameId.setCapabilityValue('alarm_generic', true);
        } else {
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          deviceNameId.setCapabilityValue('alarm_generic', false);
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
    partitionsActiveOnHomey = partitionsActiveOnHomey.filter(partId => partId !== this.getDeviceId());
  }

}

module.exports = PartitionDevice;
