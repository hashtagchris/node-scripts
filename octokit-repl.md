# octokit repl

## Steps

1. Launch node.
```
cd ~/repos/node-scripts
node --experimental-repl-await
```

2. Paste at least the first three lines below into the repl.
```
require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const github = new Octokit({ auth: process.env["GITHUB_PAT"] });

let owner = 'bbq-beets';
let repo = 'test-token-permissions-for-dependabot';
let pull_number = 2;

let pr = await github.pulls.get({ owner, repo, pull_number });
let check = await github.checks.listForRef({ owner, repo, ref: pr.data.head.sha, filter: 'latest' });
```
