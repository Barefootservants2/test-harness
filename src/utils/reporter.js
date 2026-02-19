/**
 * Test result reporter
 * Ashes2Echoes LLC | Test Harness v2.0
 */

class TestReporter {
  constructor(suiteName) {
    this.suite = suiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  pass(testName, detail) {
    this.results.push({ status: 'PASS', test: testName, detail: detail || '' });
  }

  fail(testName, detail) {
    this.results.push({ status: 'FAIL', test: testName, detail: detail || '' });
  }

  warn(testName, detail) {
    this.results.push({ status: 'WARN', test: testName, detail: detail || '' });
  }

  skip(testName, detail) {
    this.results.push({ status: 'SKIP', test: testName, detail: detail || '' });
  }

  getSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const pass = this.results.filter(r => r.status === 'PASS').length;
    const fail = this.results.filter(r => r.status === 'FAIL').length;
    const warn = this.results.filter(r => r.status === 'WARN').length;
    const skip = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    const passRate = total > 0 ? ((pass / (total - skip)) * 100).toFixed(1) : 0;

    return {
      suite: this.suite,
      total,
      pass,
      fail,
      warn,
      skip,
      passRate: parseFloat(passRate),
      elapsed: parseFloat(elapsed),
      results: this.results
    };
  }

  printReport() {
    const s = this.getSummary();
    const icon = { PASS: '✅', FAIL: '❌', WARN: '⚠️', SKIP: '⏭️' };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${s.suite}`);
    console.log(`${'='.repeat(60)}`);

    for (const r of this.results) {
      const detail = r.detail ? ` — ${r.detail}` : '';
      console.log(`  ${icon[r.status]} ${r.status} | ${r.test}${detail}`);
    }

    console.log(`${'-'.repeat(60)}`);
    console.log(`  PASS: ${s.pass}  FAIL: ${s.fail}  WARN: ${s.warn}  SKIP: ${s.skip}  TOTAL: ${s.total}`);
    console.log(`  Pass Rate: ${s.passRate}%  |  Time: ${s.elapsed}s`);

    if (s.passRate >= 95) console.log(`  🟢 PRD READY`);
    else if (s.passRate >= 80) console.log(`  🟡 TST PASS — not PRD ready`);
    else if (s.passRate >= 50) console.log(`  🟠 DEV ONLY`);
    else console.log(`  🔴 CRITICAL — below minimum threshold`);

    console.log(`${'='.repeat(60)}\n`);
    return s;
  }
}

module.exports = { TestReporter };
