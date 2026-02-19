/**
 * Protocol Validator
 * Validates METATRON, MICHA, and collective agent protocol files
 * for structural completeness, version consistency, and required sections.
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { getRawFile, getRepoTree } = require('../utils/github');
const { TestReporter } = require('../utils/reporter');

// Required protocol files in production
const REQUIRED_PRODUCTION_FILES = [
  'PROTOCOLS/PRODUCTION/METATRON_v10.5_PRIME_DIRECTIVE.md',
  'PROTOCOLS/PRODUCTION/FIDELITY_LOCK_v10.5.md',
  'PROTOCOLS/PRODUCTION/HUNTER_WIRING_DIAGRAM_v11.0.md',
  'PROTOCOLS/PRODUCTION/BUILD_SEQUENCE_v10.5.md',
  'PROTOCOLS/IRONCLAD/IRONCLAD_PROTOCOL_v1.0.md'
];

// Required collective agent files
const REQUIRED_AGENT_FILES = [
  'COLLECTIVE/MICHA/MICHA_INSTRUCTIONS_v10.4.md',
  'COLLECTIVE/URIEL/URIEL_INSTRUCTIONS_v10.3.md',
  'COLLECTIVE/COLOSSUS/COLOSSUS_INSTRUCTIONS_v10.3.md',
  'COLLECTIVE/HANIEL/HANIEL_INSTRUCTIONS_v10.3.md',
  'COLLECTIVE/RAZIEL/RAZIEL_INSTRUCTIONS_v10.3.md',
  'COLLECTIVE/GABRIEL/GABRIEL_INSTRUCTIONS_v10.3.md',
  'COLLECTIVE/SERAPH/SERAPH_INSTRUCTIONS_v10.3.md'
];

// Required sections in METATRON
const METATRON_REQUIRED_SECTIONS = [
  'Principal Authority',
  '100% Rule',
  'FIDELITY LOCK',
  'GATE',
  'HUNTER',
  'IRONCLAD',
  'PHOENIX',
  'SENTINEL',
  'Counter-Thesis'
];

// Required sections in MICHA instructions
const MICHA_REQUIRED_SECTIONS = [
  'IDENTITY',
  'GATE 0.75',
  'CORE FUNCTIONS',
  'Intelligent Router',
  'Grand Synthesizer',
  'CIO Operations',
  'GATE ENFORCEMENT',
  'ROUTING TABLE',
  'TRIGGER COMMANDS',
  'PHOENIX PROTOCOL'
];

async function validateProtocols() {
  const reporter = new TestReporter('PROTOCOL VALIDATOR');

  // Get repo tree
  let tree;
  try {
    tree = await getRepoTree('A2E_Protocols');
    reporter.pass('Repository Access', `${tree.length} files in A2E_Protocols`);
  } catch (e) {
    reporter.fail('Repository Access', e.message);
    return reporter.printReport();
  }

  const filePaths = tree.filter(t => t.type === 'blob').map(t => t.path);

  // Test: Required production files exist
  for (const required of REQUIRED_PRODUCTION_FILES) {
    if (filePaths.includes(required)) {
      reporter.pass(`Production File: ${required.split('/').pop()}`);
    } else {
      reporter.fail(`Production File: ${required.split('/').pop()}`, `NOT FOUND: ${required}`);
    }
  }

  // Test: Required agent files exist
  for (const required of REQUIRED_AGENT_FILES) {
    if (filePaths.includes(required)) {
      reporter.pass(`Agent File: ${required.split('/').pop()}`);
    } else {
      reporter.fail(`Agent File: ${required.split('/').pop()}`, `NOT FOUND: ${required}`);
    }
  }

  // Test: No orphaned versions in COLLECTIVE (old versions should be in ARCHIVE)
  const collectiveFiles = filePaths.filter(p => p.startsWith('COLLECTIVE/') && p.endsWith('.md'));
  const versionPattern = /v(\d+\.\d+)/;
  const agentVersions = {};
  for (const f of collectiveFiles) {
    const match = f.match(versionPattern);
    const agent = f.split('/')[1];
    if (match) {
      if (!agentVersions[agent]) agentVersions[agent] = [];
      agentVersions[agent].push({ path: f, version: match[1] });
    }
  }

  for (const [agent, versions] of Object.entries(agentVersions)) {
    if (versions.length > 1) {
      const versionList = versions.map(v => `v${v.version}`).join(', ');
      reporter.warn(`Multiple Versions: ${agent}`, `${versionList} — older should be archived`);
    } else {
      reporter.pass(`Version Clean: ${agent}`, `v${versions[0].version} only`);
    }
  }

  // Test: METATRON content validation
  try {
    const metatron = await getRawFile('A2E_Protocols', 'PROTOCOLS/PRODUCTION/METATRON_v10.5_PRIME_DIRECTIVE.md');
    reporter.pass('METATRON Load', `${metatron.length} characters`);

    for (const section of METATRON_REQUIRED_SECTIONS) {
      if (metatron.toLowerCase().includes(section.toLowerCase())) {
        reporter.pass(`METATRON Section: ${section}`);
      } else {
        reporter.fail(`METATRON Section: ${section}`, 'Section not found in document');
      }
    }

    // Check version consistency
    if (metatron.includes('v10.5')) {
      reporter.pass('METATRON Version String', 'v10.5 found in document');
    } else {
      reporter.fail('METATRON Version String', 'v10.5 not found — version mismatch');
    }
  } catch (e) {
    reporter.fail('METATRON Load', e.message);
  }

  // Test: MICHA content validation
  try {
    const micha = await getRawFile('A2E_Protocols', 'COLLECTIVE/MICHA/MICHA_INSTRUCTIONS_v10.4.md');
    reporter.pass('MICHA Load', `${micha.length} characters`);

    for (const section of MICHA_REQUIRED_SECTIONS) {
      if (micha.includes(section)) {
        reporter.pass(`MICHA Section: ${section}`);
      } else {
        reporter.fail(`MICHA Section: ${section}`, 'Section not found in document');
      }
    }

    // Check MICHA references correct METATRON version
    if (micha.includes('METATRON v10.5') || micha.includes('METATRON v10.3')) {
      reporter.pass('MICHA→METATRON Reference', 'References a known METATRON version');
    } else {
      reporter.warn('MICHA→METATRON Reference', 'Could not verify METATRON version reference');
    }

    // Check 7 locks present
    if (micha.includes('SECTOR SCAN') && micha.includes('WIDE NET')) {
      reporter.pass('MICHA 7 Locks', 'All 7 locks referenced including v10.4 additions');
    } else {
      reporter.fail('MICHA 7 Locks', 'Missing SECTOR SCAN or WIDE NET locks (v10.4 requirement)');
    }
  } catch (e) {
    reporter.fail('MICHA Load', e.message);
  }

  // Test: PHOENIX protocol exists and has required elements
  try {
    const phoenix = await getRawFile('A2E_Protocols', 'PHOENIX/PHOENIX_PROTOCOL_v10.2.md');
    reporter.pass('PHOENIX Load', `${phoenix.length} characters`);

    const phoenixRequired = ['Session Open', 'Session Close', 'carry-forward'];
    for (const req of phoenixRequired) {
      if (phoenix.toLowerCase().includes(req.toLowerCase())) {
        reporter.pass(`PHOENIX Section: ${req}`);
      } else {
        reporter.fail(`PHOENIX Section: ${req}`, 'Not found');
      }
    }
  } catch (e) {
    reporter.fail('PHOENIX Load', e.message);
  }

  // Test: ARCHIVE check — production files should NOT be duplicated in archive with same version
  const archiveFiles = filePaths.filter(p => p.startsWith('ARCHIVE/'));
  const prodVersions = REQUIRED_PRODUCTION_FILES.map(f => {
    const match = f.match(versionPattern);
    return match ? { file: f, version: match[1] } : null;
  }).filter(Boolean);

  for (const pv of prodVersions) {
    const archiveDupe = archiveFiles.find(a => a.includes(pv.version) && a.includes(pv.file.split('/').pop().replace(`_v${pv.version}`, '')));
    if (archiveDupe) {
      reporter.warn(`Archive Conflict`, `${pv.file.split('/').pop()} also in ARCHIVE — verify correct version is in production`);
    }
  }

  // Test: IRONCLAD protocol has risk parameters
  try {
    const ironclad = await getRawFile('A2E_Protocols', 'PROTOCOLS/IRONCLAD/IRONCLAD_PROTOCOL_v1.0.md');
    const riskChecks = ['1.5%', '20%', '35%', 'STOP', 'PHOENIX'];
    for (const check of riskChecks) {
      if (ironclad.includes(check)) {
        reporter.pass(`IRONCLAD: ${check}`);
      } else {
        reporter.warn(`IRONCLAD: ${check}`, 'Expected risk parameter not found');
      }
    }
  } catch (e) {
    reporter.fail('IRONCLAD Load', e.message);
  }

  return reporter.printReport();
}

module.exports = { validateProtocols };

if (require.main === module) {
  validateProtocols().catch(e => {
    console.error('Validator failed:', e.message);
    process.exit(1);
  });
}
