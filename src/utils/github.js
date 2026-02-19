/**
 * GitHub API utilities for test harness
 * Uses curl subprocess for proxy compatibility in container environments.
 * 
 * Ashes2Echoes LLC | Test Harness v2.0
 */

const { execSync } = require('child_process');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = 'Barefootservants2';

function githubRequest(path) {
  try {
    const url = `https://api.github.com${path}`;
    const result = execSync(
      `curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "User-Agent: A2E-TestHarness/2.0" "${url}"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (e) {
    throw new Error(`GitHub API failed: ${path} — ${e.message}`);
  }
}

function getRawFile(repo, filePath) {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${repo}/main/${filePath}`;
    const result = execSync(
      `curl -s -H "Authorization: token ${GITHUB_TOKEN}" "${url}"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    if (result.startsWith('404') || result.includes('"message":"Not Found"')) {
      throw new Error(`File not found: ${repo}/${filePath}`);
    }
    return result;
  } catch (e) {
    throw new Error(`Raw fetch failed: ${repo}/${filePath} — ${e.message}`);
  }
}

function getRepoTree(repo) {
  const data = githubRequest(`/repos/${GITHUB_OWNER}/${repo}/git/trees/main?recursive=1`);
  return data.tree || [];
}

function listRepos() {
  return githubRequest(`/users/${GITHUB_OWNER}/repos?per_page=50`);
}

function listOwnedRepos() {
  return githubRequest(`/user/repos?per_page=50&affiliation=owner`);
}

module.exports = { githubRequest, getRawFile, getRepoTree, listRepos, listOwnedRepos, GITHUB_OWNER };
