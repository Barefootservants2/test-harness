/**
 * Repository Health Validator
 * Checks all repos for accessibility, expected structure, and staleness.
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { listOwnedRepos, getRepoTree } = require('../utils/github');
const { TestReporter } = require('../utils/reporter');

// Expected repos and their minimum expected files
const EXPECTED_REPOS = {
  'A2E_Protocols': { minFiles: 50, critical: true, requiredDirs: ['COLLECTIVE', 'PROTOCOLS', 'PHOENIX'] },
  'AIORA': { minFiles: 15, critical: true, requiredDirs: ['n8n_workflows', 'docs'] },
  'Ashes2Echoes': { minFiles: 1, critical: false, requiredDirs: [] },
  'A2E_EmailArchive': { minFiles: 1, critical: false, requiredDirs: [] },
  'A2E_Website': { minFiles: 10, critical: false, requiredDirs: ['app', 'components'] },
  'A2E_Apparel': { minFiles: 1, critical: false, requiredDirs: [] },
  'A2E_Infrastructure': { minFiles: 3, critical: false, requiredDirs: [] },
  'test-harness': { minFiles: 5, critical: true, requiredDirs: ['src'] },
  'github-mcp-server': { minFiles: 3, critical: false, requiredDirs: [] },
  'AllChats': { minFiles: 0, critical: false, requiredDirs: [] },
  'forge-landing': { minFiles: 1, critical: false, requiredDirs: [] },
  'etrade-oauth-debug': { minFiles: 1, critical: false, requiredDirs: [] },
  'n8n-docs': { minFiles: 1, critical: false, requiredDirs: [] }
};

const STALE_THRESHOLD_DAYS = 30;

async function validateRepos() {
  const reporter = new TestReporter('REPOSITORY HEALTH VALIDATOR');

  let repos;
  try {
    repos = await listOwnedRepos();
    reporter.pass('GitHub API Access', `${repos.length} repos found`);
  } catch (e) {
    reporter.fail('GitHub API Access', e.message);
    return reporter.printReport();
  }

  // Test: Expected repo count
  if (repos.length >= 13) {
    reporter.pass('Repo Count', `${repos.length} repos (expected 13+)`);
  } else {
    reporter.warn('Repo Count', `${repos.length} repos — expected at least 13`);
  }

  // Test: Each expected repo exists and is accessible
  for (const [repoName, config] of Object.entries(EXPECTED_REPOS)) {
    const repo = repos.find(r => r.name === repoName);

    if (!repo) {
      if (config.critical) {
        reporter.fail(`Repo Exists: ${repoName}`, 'CRITICAL repo not found');
      } else {
        reporter.warn(`Repo Exists: ${repoName}`, 'Not found');
      }
      continue;
    }

    reporter.pass(`Repo Exists: ${repoName}`, `${repo.private ? 'PRIVATE' : 'PUBLIC'} | ${repo.size}KB`);

    // Test: Staleness
    const updatedAt = new Date(repo.updated_at);
    const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate <= STALE_THRESHOLD_DAYS) {
      reporter.pass(`Fresh: ${repoName}`, `Updated ${daysSinceUpdate} days ago`);
    } else if (config.critical) {
      reporter.fail(`Stale: ${repoName}`, `CRITICAL repo not updated in ${daysSinceUpdate} days`);
    } else {
      reporter.warn(`Stale: ${repoName}`, `Not updated in ${daysSinceUpdate} days`);
    }

    // Test: Empty repo check
    if (repo.size === 0 && config.minFiles > 0) {
      reporter.fail(`Empty: ${repoName}`, `Size=0KB but expected ${config.minFiles}+ files`);
      continue;
    }

    // Test: Required directories (only for critical repos)
    if (config.requiredDirs.length > 0) {
      try {
        const tree = await getRepoTree(repoName);
        const dirs = [...new Set(tree.filter(t => t.type === 'tree').map(t => t.path.split('/')[0]))];
        const files = tree.filter(t => t.type === 'blob');

        // File count
        if (files.length >= config.minFiles) {
          reporter.pass(`File Count: ${repoName}`, `${files.length} files (min: ${config.minFiles})`);
        } else {
          reporter.fail(`File Count: ${repoName}`, `${files.length} files — expected ${config.minFiles}+`);
        }

        // Required dirs
        for (const reqDir of config.requiredDirs) {
          if (dirs.includes(reqDir) || tree.some(t => t.path.startsWith(reqDir + '/'))) {
            reporter.pass(`Dir: ${repoName}/${reqDir}`);
          } else {
            reporter.fail(`Dir: ${repoName}/${reqDir}`, 'Required directory missing');
          }
        }
      } catch (e) {
        reporter.warn(`Tree: ${repoName}`, `Could not fetch tree: ${e.message}`);
      }
    }
  }

  // Test: No unexpected repos
  const knownNames = Object.keys(EXPECTED_REPOS);
  const unknown = repos.filter(r => !knownNames.includes(r.name));
  if (unknown.length > 0) {
    for (const u of unknown) {
      reporter.warn(`Unknown Repo: ${u.name}`, `${u.private ? 'PRIVATE' : 'PUBLIC'} | ${u.size}KB — not in expected list`);
    }
  }

  return reporter.printReport();
}

module.exports = { validateRepos };

if (require.main === module) {
  validateRepos().catch(e => {
    console.error('Validator failed:', e.message);
    process.exit(1);
  });
}
