#!/usr/bin/env node

require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env["GITHUB_PAT"],
});

(async function() {
  await octokit.repos.createCommitStatus({
    owner: "hashtagchris",
    repo: "test-workflows",
    sha: "b31c28e0761ea7055b362947360776a2129873be",
    state: "success",
    context: "create-status.js",
    description: "be excellent to each other",
  });
})();
