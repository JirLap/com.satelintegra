/* eslint-disable eqeqeq */
/* eslint-disable max-len */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

let OutputsActiveOnHomey = [];
let eventBusEnable = false;

class OutputDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Outputs: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are used
    OutputsActiveOnHomey.push(this.getDeviceId());
    const driver = Homey.ManagerDrivers.getDriver('outputs');
    const deviceNameId = driver.getDevice({ id: this.getDeviceId().toString() });
    deviceNameId.setCapabilityValue('onoff', false);

    eventBus.publish('outputstatuspolltrue', true);

    // incoming outputstatus
    if (!eventBusEnable) {
      eventBus.subcribe('outputstatus', payload => {
        this.outputStatus(payload);
      });
      eventBusEnable = true;
    }

    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value, opts) {
    if (value == true) {
      this.log(`Output ON : ${this.getDeviceId()}`);
      eventBus.publish('satelSend', this.outputAction('88', this.getDeviceId()));
    } else {
      eventBus.publish('satelSend', this.outputAction('89', this.getDeviceId()));
    }
  }

  outputAction(mode, deviceID) {
    let ary = [];
    // first byte is command code ()
    ary.push(mode);
    // next 8 bytes are usercode
    ary = ary.concat(functions.stringToHexBytes(Homey.ManagerSettings.get('alarmcode'), 8, 'F'));
    // next 16 bytes are outputs
    ary = ary.concat(functions.outputListToByteArray(deviceID));
    return functions.createFrameArray(ary);
  }

  getDeviceId() {
    const deviceID = Object.values(this.getData());
    return deviceID[0];
  }

  async outputStatus(payload) {
    const driver = Homey.ManagerDrivers.getDriver('outputs');
    payload = payload.slice(1);
    let outputId = 0;
    for (const list of payload) {
      const binarray = Array.from(functions.hex2bin(list));
      for (let i = binarray.length - 1; i >= 0; --i) {
        outputId++;
        if (OutputsActiveOnHomey.indexOf(outputId.toString()) === -1) {
          continue;
        }
        if (binarray[i] == 1) {
          const deviceStatusPanel = [[outputId], 'true'];
          const deviceNameId = driver.getDevice({ id: outputId.toString() });
          const deviceStatusHomey = deviceNameId.getCapabilityValue('onoff');
          if (deviceStatusHomey.toString() != deviceStatusPanel[1].toString()) {
            deviceNameId.setCapabilityValue('onoff', true);
            this.log(`Active Output:  ${outputId}`);
          }
        } else {
          const deviceStatusPanel = [[outputId], 'false'];
          const deviceNameId = driver.getDevice({ id: outputId.toString() });
          const deviceStatusHomey = deviceNameId.getCapabilityValue('onoff');
          if (deviceStatusHomey.toString() != deviceStatusPanel[1].toString()) {
            deviceNameId.setCapabilityValue('onoff', false);
          }
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
    OutputsActiveOnHomey = OutputsActiveOnHomey.filter(outputId => outputId !== this.getDeviceId());
  }

}

module.exports = OutputDevice;
