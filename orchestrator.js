const express = require('express');
const Docker = require('dockerode');
const path = require('path');
const simpleGit = require('simple-git');
const fs = require('fs');

const app = express();
const docker = new Docker();
const git = simpleGit();

app.use(express.json());

// List of repositories to manage
const REPOS = [
  { name: 'hello-docker', url: 'https://github.com/DevMorph77/hello-docker.git' }
];

const BASE_REPO_PATH = path.join(__dirname, 'repos');
const BASE_REPORT_PATH = path.join(__dirname, 'reports');

// Ensure base folders exist
if (!fs.existsSync(BASE_REPO_PATH)) fs.mkdirSync(BASE_REPO_PATH, { recursive: true });
if (!fs.existsSync(BASE_REPORT_PATH)) fs.mkdirSync(BASE_REPORT_PATH, { recursive: true });

// --- Functions ---

async function updateRepo(repo) {
  const repoPath = path.join(BASE_REPO_PATH, repo.name);
  if (!fs.existsSync(path.join(repoPath, '.git'))) {
    console.log(`Cloning ${repo.name}...`);
    await git.clone(repo.url, repoPath);
  } else {
    console.log(`Pulling latest for ${repo.name}...`);
    await git.cwd(repoPath).pull('origin', 'main');
  }
}

async function runTests(repo) {
  const repoPath = path.join(BASE_REPO_PATH, repo.name);
  const reportPath = path.join(BASE_REPORT_PATH, repo.name);

  if (!fs.existsSync(reportPath)) fs.mkdirSync(reportPath, { recursive: true });

  const container = await docker.createContainer({
    Image: 'playwright-image',
    Cmd: ['npx', 'playwright', 'test', '--reporter=html', '--output', '/app/playwright-report'],
    HostConfig: {
      Binds: [`${repoPath}:/app`, `${reportPath}:/app/playwright-report`],
      AutoRemove: true
    },
    Tty: true
  });

  await container.start();
  await container.wait();
  console.log(`Tests finished for ${repo.name}`);
}

// --- API Endpoints ---

// Update all repos
app.post('/update-repos', async (req, res) => {
  try {
    for (const repo of REPOS) {
      await updateRepo(repo);
    }
    res.send('All repos updated successfully!');
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// Run tests for all repos
app.post('/run-tests', async (req, res) => {
  try {
    for (const repo of REPOS) {
      // Always update before running tests
      await updateRepo(repo);
      await runTests(repo);
    }
    res.send('All tests completed!');
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

// --- Optional CLI commands ---
if (process.argv.includes('--update-repos')) {
  (async () => {
    for (const repo of REPOS) await updateRepo(repo);
    console.log('All repos updated!');
    process.exit(0);
  })();
}

if (process.argv.includes('--run-tests')) {
  (async () => {
    for (const repo of REPOS) {
      await updateRepo(repo);
      await runTests(repo);
    }
    console.log('All tests completed!');
    process.exit(0);
  })();
}

// --- Start API Server ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Orchestrator running on port ${PORT}`));
