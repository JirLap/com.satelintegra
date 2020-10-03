/* eslint-disable no-unused-vars */

'use strict';

const Homey = require('homey');
const { ManagerSettings } = require('homey');
const functions = require('../../functions/functions');

class integraAlarmDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Initialize device');
    this.log(' * Name:', this.getName());
    this.log(' * Driver:', this.getDriver().id);
    this.log(' * Class:', this.getClass());
    this.log(' * Available: ', this.getAvailable());
    this.log(' * Capabilities:', this.getCapabilities());
    this.log(' * State:', this.getState());
    this.log(' * Settings: ', this.getSettings());
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
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
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

}

module.exports = integraAlarmDevice;
