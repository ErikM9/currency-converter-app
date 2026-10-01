import { startStaticServer, stopStaticServer, BASE_URL } from './tests/e2e/support/static-server.js';

export const shared = {
  runner: 'local',
  specs: ['./tests/e2e/specs/**/*.e2e.js'],
  /* The live-API check is opt-in, so it is left out of a normal run rather than reported as skipped; RUN_LIVE_API adds it back */
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

  /* The suite serves the app itself, so nothing has to be started by hand before a run */
  onPrepare: () => startStaticServer(),
  onComplete: () => stopStaticServer(),

  /* A picture of what the browser was showing makes a failure much quicker to read */
  afterTest: async (test, context, { passed }) => {
    if (passed) return;
    const name = `${test.parent} ${test.title}`.replace(/[^\w]+/g, '-');
    await browser.saveScreenshot(`./screenshots/${name}.png`);
  }
};