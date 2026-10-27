import { startStaticServer, stopStaticServer, BASE_URL } from './tests/e2e/support/static-server.js';

export const shared = {
  runner: 'local',
  specs: ['./tests/e2e/specs/**/*.e2e.js'],
  /* The live API check is opt-in and only runs when RUN_LIVE_API is set */
  exclude: process.env.RUN_LIVE_API ? [] : ['./tests/e2e/specs/live-api.e2e.js'],
  maxInstances: 1,

  logLevel: 'warn',
  bail: 0,
  baseUrl: BASE_URL,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
    forbidOnly: Boolean(process.env.CI)
  },

  reporters: ['spec'],

  /* The suite serves the app itself for the length of the run */
  onPrepare: () => startStaticServer(),
  onComplete: () => stopStaticServer(),

  /* Every spec file gets a browser of its own, which this starts at the same size in Chrome and Firefox */
  before: () => browser.setWindowSize(1280, 800),

  /* Saves a screenshot whenever a test fails */
  afterTest: async (test, context, { passed }) => {
    if (passed) return;
    const name = `${test.parent} ${test.title}`.replace(/[^\w]+/g, '-');
    await browser.saveScreenshot(`./screenshots/${name}.png`);
  }
};