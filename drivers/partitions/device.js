/* eslint-disable max-len */
/* eslint-disable eqeqeq */

'use strict';

const Homey = require('homey');
const eventBus = require('@tuxjs/eventbus');
const functions = require('../../js/functions');

let partitionsActiveOnHomey = [];

class Device extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`Partition: ${this.getName()} initialized ID: ${this.getDeviceId()}`);

    // make array by deviceID on wich devices are initialized and are uses
    partitionsActiveOnHomey.push(this.getDeviceId());

    eventBus.publish('partitionstatuspolltrue', true);

    // incoming partitionstatus
    eventBus.subcribe('partitionstatus', payload => {
      this.partitionStatus(payload);
    });

    // incoming partitionsalarm
    eventBus.subcribe('partitionalarm', payload => {
      this.partitionAlarms(payload);
    });

    this.registerCapabilityListener('homealarm_state', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value, opts) {
    if (value == 'armed') {
      this.log(`ARM Partition : ${this.getDeviceId()}`);
      eventBus.publish('satelSend', this.armDisAction('80', this.getDeviceId()));
    } else {
      eventBus.publish('satelSend', this.armDisAction('84', this.getDeviceId()));
    }

    // register listener for ACTION "disarm" FlowCard
    new Homey.FlowCardAction('actionDisarmAlarm')
      .register()
      .registerRunListener(() => {
        this.log(' DIS-ARMING ALARM...');
        return Promise.resolve(true);
      });

    // register listener for ACTION "arm" FlowCard
    new Homey.FlowCardAction('actionArmAlarm')
      .register()
      .registerRunListener(() => {
        this.log('ARMING ALARM...');
        return Promise.resolve(true);
      });

    // register listener for CONDITION "conditionIsArmed"
    new Homey.FlowCardCondition('conditionIsArmed')
      .register()
      .registerRunListener(() => {
        return Promise.resolve(true);
      });

    // register listener for TRIGGER "triggerGotArmed"
    this.triggerGotArmed = new Homey.FlowCardTrigger('triggerGotArmed');
    this.triggerGotArmed
      .registerRunListener(() => {
      // If true, this flow should run
        return Promise.resolve(true);
      }).register();

    // register listener for TRIGGER "triggerGotDisarmed"
    this.triggerGotDisarmed = new Homey.FlowCardTrigger('triggerGotDisarmed');
    this.triggerGotDisarmed
      .registerRunListener(() => {
      // If true, this flow should run
        return Promise.resolve(true);
      }).register();
  }

  armDisAction(mode, deviceID) {
    let ary = [];
    // first byte is command code ()
    ary.push(mode);
    // next 8 bytes are usercode
    ary = ary.concat(functions.stringToHexBytes(Homey.ManagerSettings.get('alarmcode'), 8, 'F'));
    // next 4 bytes are zones to arm
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
          this.log(`Active partition:  ${partId}`);
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          deviceNameId.setCapabilityValue('homealarm_state', 'armed');
          // this.triggerGotArmed.trigger().then().catch();
        } else {
          const deviceNameId = driver.getDevice({ id: partId.toString() });
          deviceNameId.setCapabilityValue('homealarm_state', 'disarmed');
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

module.exports = Device;
