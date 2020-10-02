'use strict';

const Homey = require('homey');

class SatelIntegraApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('SatelIntegraApp has been initialized');
  }

}

module.exports = SatelIntegraApp;
