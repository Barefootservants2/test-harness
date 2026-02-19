#!/usr/bin/env node
/**
 * A2E Test Harness — Full Suite Runner
 * Runs all validators and produces aggregate report.
 * 
 * Usage:
 *   node src/runners/full-suite.js              # Run all suites
 *   node src/runners/full-suite.js --hunter     # HUNTER only
 *   node src/runners/full-suite.js --protocol   # Protocols only
 *   node src/runners/full-suite.js --repo       # Repo health only
 *   node src/runners/full-suite.js --code       # H30-H35 code only
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { validateHunterWorkflow } = require('../validators/hunter-validator');
const { validateProtocols } = require('../validators/protocol-validator');
const { validateRepos } = require('../validators/repo-validator');
const { validateHunterCode } = require('../validators/code-validator');

async function runFullSuite(options = {}) {
  const args = process.argv.slice(2);
  const runAll = args.length === 0;
  const runHunter = runAll || args.includes('--hunter');
  const runProtocol = runAll || args.includes('--protocol');
  const runRepo = runAll || args.includes('--repo');
  const runCode = runAll || args.includes('--code');

  const startTime = Date.now();
  const allResults = [];

  console.log('\n🔱 A2E TEST HARNESS v2.0 — FULL SUITE');
  console.log(`   ${new Date().toISOString()}`);
  console.log(`   Ashes2Echoes LLC | Uriel Covenant AI Collective`);

  if (runRepo) {
    console.log('\n📦 Running Repository Health Validator...');
    try {
      const result = await validateRepos();
      allResults.push(result);
    } catch (e) {
      console.error(`   ❌ Repo validator crashed: ${e.message}`);
      allResults.push({ suite: 'REPO', pass: 0, fail: 1, warn: 0, total: 1, passRate: 0 });
    }
  }

  if (runProtocol) {
    console.log('\n📜 Running Protocol Validator...');
    try {
      const result = await validateProtocols();
      allResults.push(result);
    } catch (e) {
      console.error(`   ❌ Protocol validator crashed: ${e.message}`);
      allResults.push({ suite: 'PROTOCOL', pass: 0, fail: 1, warn: 0, total: 1, passRate: 0 });
    }
  }

  if (runHunter) {
    console.log('\n🎯 Running HUNTER Workflow Validator...');
    try {
      const result = await validateHunterWorkflow();
      allResults.push(result);
    } catch (e) {
      console.error(`   ❌ HUNTER validator crashed: ${e.message}`);
      allResults.push({ suite: 'HUNTER', pass: 0, fail: 1, warn: 0, total: 1, passRate: 0 });
    }
  }

  if (runCode) {
    console.log('\n💻 Running H30-H35 Code Validator...');
    try {
      const result = await validateHunterCode();
      allResults.push(result);
    } catch (e) {
      console.error(`   ❌ Code validator crashed: ${e.message}`);
      allResults.push({ suite: 'CODE', pass: 0, fail: 1, warn: 0, total: 1, passRate: 0 });
    }
  }

  // Aggregate report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totals = {
    pass: allResults.reduce((s, r) => s + r.pass, 0),
    fail: allResults.reduce((s, r) => s + r.fail, 0),
    warn: allResults.reduce((s, r) => s + r.warn, 0),
    skip: allResults.reduce((s, r) => s + (r.skip || 0), 0),
    total: allResults.reduce((s, r) => s + r.total, 0)
  };
  const activeTests = totals.total - totals.skip;
  const overallPassRate = activeTests > 0 ? ((totals.pass / activeTests) * 100).toFixed(1) : 0;

  console.log('\n' + '█'.repeat(60));
  console.log('  AGGREGATE RESULTS');
  console.log('█'.repeat(60));

  for (const r of allResults) {
    const icon = r.passRate >= 95 ? '🟢' : r.passRate >= 80 ? '🟡' : r.passRate >= 50 ? '🟠' : '🔴';
    console.log(`  ${icon} ${r.suite}: ${r.pass}/${r.total - (r.skip || 0)} passed (${r.passRate}%)`);
  }

  console.log('─'.repeat(60));
  console.log(`  TOTAL: ${totals.pass} pass | ${totals.fail} fail | ${totals.warn} warn | ${totals.total} tests`);
  console.log(`  OVERALL PASS RATE: ${overallPassRate}%`);
  console.log(`  ELAPSED: ${elapsed}s`);

  if (parseFloat(overallPassRate) >= 95) {
    console.log('\n  🟢 PRODUCTION READY');
  } else if (parseFloat(overallPassRate) >= 80) {
    console.log('\n  🟡 TEST ENVIRONMENT PASS — Not production ready');
  } else if (parseFloat(overallPassRate) >= 50) {
    console.log('\n  🟠 DEVELOPMENT ONLY — Significant issues');
  } else {
    console.log('\n  🔴 CRITICAL — System not operational');
  }

  console.log('█'.repeat(60) + '\n');

  // Return aggregate for programmatic use
  return {
    suites: allResults,
    totals,
    passRate: parseFloat(overallPassRate),
    elapsed: parseFloat(elapsed)
  };
}

module.exports = { runFullSuite };

if (require.main === module) {
  runFullSuite().then(result => {
    process.exit(result.totals.fail > 0 ? 1 : 0);
  }).catch(e => {
    console.error('Suite runner crashed:', e.message);
    process.exit(1);
  });
}
