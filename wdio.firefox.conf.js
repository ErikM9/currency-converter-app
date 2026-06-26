export const config = {
  runner: 'local',
  specs: ['./tests/e2e/**/*.test.js'],
  maxInstances: 1,

  capabilities: [{
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: ['-headless']
    }
  }],

  automationProtocol: 'webdriver',

  logLevel: 'warn',
  bail: 0,
  baseUrl: 'http://localhost:3000',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },

  reporters: ['spec']
};