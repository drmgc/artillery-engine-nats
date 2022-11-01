'use strict';

const debug = require('debug')('plugin:nats');

class ArtilleryPluginNats {
  constructor(script, events) {
    debug('setting up NATS plugin');
  }
}

export const Plugin = ArtilleryPluginNats;
