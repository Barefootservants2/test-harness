/**
 * H30-H35 Code Validator
 * Validates JavaScript code for HUNTER Influence Chain modules.
 * Checks syntax, expected exports, data structure compliance.
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { getRawFile } = require('../utils/github');
const { TestReporter } = require('../utils/reporter');
const vm = require('vm');

const HUNTER_CODE_FILES = [
  { file: 'N8N/HUNTER_CODE/H30_NORMALIZE_FINNHUB.js', module: 'H30', source: 'Finnhub' },
  { file: 'N8N/HUNTER_CODE/H31_NORMALIZE_CONGRESS.js', module: 'H31', source: 'Congress.gov' },
  { file: 'N8N/HUNTER_CODE/H32_NORMALIZE_SENATE_LDA.js', module: 'H32', source: 'Senate LDA' },
  { file: 'N8N/HUNTER_CODE/H33_NORMALIZE_USASPENDING.js', module: 'H33', source: 'USASpending' },
  { file: 'N8N/HUNTER_CODE/H34_NORMALIZE_FEC.js', module: 'H34', source: 'FEC' },
  { file: 'N8N/HUNTER_CODE/H35_CORRELATOR.js', module: 'H35', source: 'Correlator' },
  { file: 'N8N/HUNTER_CODE/HUNTER_CONSOLIDATION_NODE.js', module: 'CONSOLIDATION', source: 'Consolidation' }
];

// Expected output structure from normalize modules
const EXPECTED_NORMALIZE_FIELDS = ['module_id', 'source', 'timestamp', 'data'];

async function validateHunterCode() {
  const reporter = new TestReporter('H30-H35 CODE VALIDATOR');

  for (const codeFile of HUNTER_CODE_FILES) {
    let code;
    try {
      code = await getRawFile('A2E_Protocols', codeFile.file);
      reporter.pass(`Load: ${codeFile.module}`, `${code.length} chars from ${codeFile.file.split('/').pop()}`);
    } catch (e) {
      reporter.fail(`Load: ${codeFile.module}`, e.message);
      continue;
    }

    // Test: JavaScript syntax validation
    // n8n Code nodes execute inside an async function wrapper, so bare return statements are valid
    try {
      const wrapped = `(async function() {\n${code}\n})()`;
      new vm.Script(wrapped, { filename: codeFile.file });
      reporter.pass(`Syntax: ${codeFile.module}`, 'JavaScript parses without error (n8n function context)');
    } catch (e) {
      reporter.fail(`Syntax: ${codeFile.module}`, `Parse error: ${e.message}`);
      continue; // No point checking further if syntax is broken
    }

    // Test: Module identification — should reference its own module ID
    if (code.includes(codeFile.module) || code.includes(codeFile.module.toLowerCase())) {
      reporter.pass(`Module ID: ${codeFile.module}`, 'References own module identifier');
    } else {
      reporter.warn(`Module ID: ${codeFile.module}`, 'Does not reference own module ID in code');
    }

    // Test: Source reference — should mention data source
    if (code.toLowerCase().includes(codeFile.source.toLowerCase())) {
      reporter.pass(`Source Ref: ${codeFile.module}`, `References ${codeFile.source}`);
    } else {
      reporter.warn(`Source Ref: ${codeFile.module}`, `Does not reference ${codeFile.source} — may use different naming`);
    }

    // Test: n8n compatibility — should use $input or items pattern for n8n Code node
    const n8nPatterns = ['$input', 'items', '$json', 'return'];
    const foundPatterns = n8nPatterns.filter(p => code.includes(p));
    if (foundPatterns.length >= 2) {
      reporter.pass(`n8n Compat: ${codeFile.module}`, `Uses: ${foundPatterns.join(', ')}`);
    } else {
      reporter.warn(`n8n Compat: ${codeFile.module}`, `Only found: ${foundPatterns.join(', ')} — may not work as n8n Code node`);
    }

    // Test: Error handling — should have try/catch
    if (code.includes('try') && code.includes('catch')) {
      reporter.pass(`Error Handling: ${codeFile.module}`, 'Has try/catch');
    } else {
      reporter.fail(`Error Handling: ${codeFile.module}`, 'No try/catch — will crash on bad input');
    }

    // Test: Output structure — normalize modules should produce standard fields
    if (codeFile.module !== 'H35' && codeFile.module !== 'CONSOLIDATION') {
      for (const field of EXPECTED_NORMALIZE_FIELDS) {
        if (code.includes(field)) {
          reporter.pass(`Output Field: ${codeFile.module}.${field}`);
        } else {
          reporter.warn(`Output Field: ${codeFile.module}.${field}`, 'Expected field not found in code');
        }
      }
    }

    // Test: No hardcoded API keys
    const apiKeyPatterns = [
      /['\"]sk-[a-zA-Z0-9]{20,}['"]/,
      /['\"]ghp_[a-zA-Z0-9]{20,}['"]/,
      /['\"]pplx-[a-zA-Z0-9]{20,}['"]/,
      /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i
    ];

    let hasHardcodedKey = false;
    for (const pattern of apiKeyPatterns) {
      if (pattern.test(code)) {
        reporter.fail(`Security: ${codeFile.module}`, 'HARDCODED API KEY DETECTED');
        hasHardcodedKey = true;
        break;
      }
    }
    if (!hasHardcodedKey) {
      reporter.pass(`Security: ${codeFile.module}`, 'No hardcoded API keys');
    }
  }

  return reporter.printReport();
}

module.exports = { validateHunterCode };

if (require.main === module) {
  validateHunterCode().catch(e => {
    console.error('Validator failed:', e.message);
    process.exit(1);
  });
}
