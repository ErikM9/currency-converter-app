import { shared } from './wdio.shared.conf.js';

export const config = {
  ...shared,

  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
      /* Lets a container point WebdriverIO at whichever Chrome build it has */
      ...(process.env.CHROME_BINARY ? { binary: process.env.CHROME_BINARY } : {})
    }
  }],

  /* Stubbing requests needs the DevTools protocol, which is why Chrome runs the full suite */
  automationProtocol: 'devtools'
};