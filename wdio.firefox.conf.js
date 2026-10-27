import { shared } from './wdio.shared.conf.js';

export const config = {
  ...shared,

  capabilities: [{
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: ['-headless']
    }
  }],

  automationProtocol: 'webdriver'
};