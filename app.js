'use strict';

const Homey = require('homey');
const { ManagerSettings } = require('homey');

class integraAlarm extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('-------------------------------------------------------');
    this.log(`${this.id} running...`);
    this.log(`IP Address:   ${ManagerSettings.get('alarmaddr')}`);
    this.log(`Port: ${ManagerSettings.get('alarmport')}`);
    this.log(`Usercode:  ${ManagerSettings.get('alarmcode')}`);
    this.log(`Polling interval:  ${ManagerSettings.get('alarmpoll')} ms`);
    this.log('-------------------------------------------------------');
  }

}

module.exports = integraAlarm;
