import { readFileSync } from 'node:fs';

const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

/* Runs an axe scan in the page and returns one line per violation */
export async function wcagViolations() {
  await browser.execute(axeSource);

  return browser.executeAsync((done) => {
    window.axe
      .run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
      .then((results) => done(results.violations.map((violation) => `${violation.id}: ${violation.help}`)));
  });
}