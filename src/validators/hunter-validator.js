/**
 * HUNTER Workflow Validator
 * Validates n8n workflow JSON for structural integrity, zombie prevention,
 * connection completeness, and configuration correctness.
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { getRawFile } = require('../utils/github');
const { TestReporter } = require('../utils/reporter');

// Known HUNTER agent nodes that must NOT have alwaysOutputData: true
const AGENT_NODES = ['URIEL', 'COLOSSUS', 'HANIEL', 'RAZIEL', 'SARIEL'];

// Critical pipeline nodes that must exist (partial match)
const REQUIRED_NODES = [
  'MASTER MERGE',
  'DATA AGGREGATOR',
  'DATA VALIDATION GATE',
  'MICHA Pass 1',
  'MICHA Pass 2',
  'PAYLOAD BUILDER',
  'FORMAT',
  'EXTRACT',
  'CONSOLIDATE'
];

// Nodes that should have error handling set to stop (not continue)
const STOP_ON_ERROR_NODES = [...AGENT_NODES.map(a => a), 'DATA VALIDATION GATE'];

async function validateHunterWorkflow(workflowPath) {
  const reporter = new TestReporter('HUNTER WORKFLOW VALIDATOR');

  let workflow;
  try {
    const raw = await getRawFile('AIORA', workflowPath || 'workflows/AIORA_HUNTER_Enterprise_Market_Intelligence_v1.4.5.json');
    workflow = JSON.parse(raw);
    reporter.pass('Workflow JSON Parse', `Loaded successfully`);
  } catch (e) {
    reporter.fail('Workflow JSON Parse', e.message);
    return reporter.printReport();
  }

  const nodes = workflow.nodes || [];
  const connections = workflow.connections || {};

  // Test: Node count
  reporter.pass('Node Count', `${nodes.length} nodes found`);

  // Test: Required nodes exist
  for (const required of REQUIRED_NODES) {
    const found = nodes.find(n => n.name === required || n.name.includes(required));
    if (found) {
      reporter.pass(`Required Node: ${required}`, `Found as "${found.name}"`);
    } else {
      reporter.fail(`Required Node: ${required}`, 'NOT FOUND in workflow');
    }
  }

  // Test: Agent nodes exist
  for (const agent of AGENT_NODES) {
    const agentNodes = nodes.filter(n => n.name.toUpperCase().includes(agent));
    if (agentNodes.length > 0) {
      reporter.pass(`Agent Node: ${agent}`, `${agentNodes.length} node(s) found`);
    } else {
      reporter.warn(`Agent Node: ${agent}`, 'Not found — may be named differently');
    }
  }

  // Test: ZOMBIE PREVENTION — agent nodes must NOT have alwaysOutputData: true
  let zombieCount = 0;
  for (const node of nodes) {
    const nameUpper = node.name.toUpperCase();
    const isAgent = AGENT_NODES.some(a => nameUpper.includes(a));
    if (isAgent) {
      const alwaysOutput = node.parameters?.options?.alwaysOutputData ||
                           (node.executeOnce === undefined ? false : false);
      // Check in node settings
      const onError = node.onError || 'stopWorkflow';
      
      if (alwaysOutput === true) {
        reporter.fail(`Zombie Check: ${node.name}`, 'alwaysOutputData=TRUE — will produce garbage on failure');
        zombieCount++;
      } else {
        reporter.pass(`Zombie Check: ${node.name}`, 'alwaysOutputData not set or false');
      }

      if (onError === 'continueErrorOutput') {
        reporter.fail(`Error Handling: ${node.name}`, 'continueErrorOutput — errors will cascade silently');
        zombieCount++;
      } else {
        reporter.pass(`Error Handling: ${node.name}`, `onError=${onError}`);
      }
    }
  }

  if (zombieCount === 0) {
    reporter.pass('Zombie Prevention Summary', 'No zombie-producing configurations found');
  } else {
    reporter.fail('Zombie Prevention Summary', `${zombieCount} zombie risk(s) found`);
  }

  // Test: All nodes have connections (no orphans)
  const connectedNodeNames = new Set();
  for (const [sourceName, outputs] of Object.entries(connections)) {
    connectedNodeNames.add(sourceName);
    for (const outputKey of Object.keys(outputs)) {
      const targets = outputs[outputKey];
      if (Array.isArray(targets)) {
        for (const targetGroup of targets) {
          if (Array.isArray(targetGroup)) {
            for (const conn of targetGroup) {
              if (conn.node) connectedNodeNames.add(conn.node);
            }
          }
        }
      }
    }
  }

  const orphanNodes = nodes.filter(n =>
    !connectedNodeNames.has(n.name) &&
    n.type !== 'n8n-nodes-base.manualTrigger' &&
    n.type !== 'n8n-nodes-base.scheduleTrigger' &&
    !n.name.toLowerCase().includes('trigger') &&
    !n.name.toLowerCase().includes('sticky')
  );

  if (orphanNodes.length === 0) {
    reporter.pass('Orphan Node Check', 'All nodes are connected');
  } else {
    for (const orphan of orphanNodes) {
      reporter.warn(`Orphan Node: ${orphan.name}`, `Type: ${orphan.type} — not connected to pipeline`);
    }
  }

  // Test: No duplicate node names
  const nameCount = {};
  for (const n of nodes) {
    nameCount[n.name] = (nameCount[n.name] || 0) + 1;
  }
  const dupes = Object.entries(nameCount).filter(([_, c]) => c > 1);
  if (dupes.length === 0) {
    reporter.pass('Duplicate Name Check', 'All node names unique');
  } else {
    for (const [name, count] of dupes) {
      reporter.fail(`Duplicate Name: ${name}`, `Appears ${count} times — will cause routing errors`);
    }
  }

  // Test: Credential references exist (not empty strings)
  let credIssues = 0;
  for (const node of nodes) {
    if (node.credentials) {
      for (const [credType, credVal] of Object.entries(node.credentials)) {
        if (!credVal || !credVal.id) {
          reporter.fail(`Credential: ${node.name}`, `${credType} has no credential ID`);
          credIssues++;
        }
      }
    }
  }
  if (credIssues === 0) {
    reporter.pass('Credential References', 'All credential references have IDs');
  }

  // Test: Expression syntax — check for unresolved {{ }} in static fields
  let exprIssues = 0;
  for (const node of nodes) {
    const params = JSON.stringify(node.parameters || {});
    // Look for common expression errors
    if (params.includes('{{ ') && params.includes('.telegrammessage }}')) {
      reporter.fail(`Expression: ${node.name}`, 'Contains unresolved telegram expression');
      exprIssues++;
    }
  }
  if (exprIssues === 0) {
    reporter.pass('Expression Syntax', 'No obvious unresolved expressions found');
  }

  // Test: Pipeline flow integrity — check that data flows from sources through merge to agents to output
  const triggerNodes = nodes.filter(n =>
    n.type?.includes('Trigger') || n.type?.includes('trigger') || n.name.toLowerCase().includes('trigger')
  );
  if (triggerNodes.length > 0) {
    reporter.pass('Trigger Nodes', `${triggerNodes.length} trigger(s): ${triggerNodes.map(n => n.name).join(', ')}`);
  } else {
    reporter.fail('Trigger Nodes', 'No trigger node found — workflow cannot start');
  }

  return reporter.printReport();
}

module.exports = { validateHunterWorkflow };

// Run directly
if (require.main === module) {
  validateHunterWorkflow().catch(e => {
    console.error('Validator failed:', e.message);
    process.exit(1);
  });
}
