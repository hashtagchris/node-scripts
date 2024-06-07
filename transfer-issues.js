#!/usr/bin/env node

require("dotenv").config();
const fs = require("fs");
const readline = require("node:readline/promises");

const graphql = require("@octokit/graphql").graphql.defaults({
  headers: {
    authorization: `token ${process.env["GITHUB_PAT"]}`,
  },
});

if (process.argv.length !== 3) {
  console.log(`Usage: node transfer-issues <destination-nwo>`);
  console.log(`
    graphql node ids for the issues to transfer are read from stdin, one id per line.

    Example usage: ./get-issues-by-author.js foo/repo somebot | ./transfer-issues foo/repo-alerts

    Prereqs:\n* Run 'npm install'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value.
  `);
  return;
}

const nwo = process.argv[2];

const [owner, repo] = nwo.split("/");

if (!owner || !repo) {
  throw new Error("Couldn't parse args");
}

(async function () {
  const destinationRepoId = await getDestinationRepoId(owner, repo);

  const rl = readline.createInterface({ input: process.stdin });

  let pendingIds = [];
  for await (const line of rl) {
    console.log(`Read node ID: ${line}`);
    pendingIds.push(line);

    if (pendingIds.length === 25) {
      await transferIssues(destinationRepoId, pendingIds);
      pendingIds = [];
    }
  }

  console.log("done reading file");

  // Transfer any remaining issues
  if (pendingIds.length) {
    await transferIssues(destinationRepoId, pendingIds);
    pendingIds = [];
  }
})();

async function getDestinationRepoId(owner, repo) {
  const queryResult = await graphql(
    `
      query ($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
        }
      }
    `,
    {
      owner,
      repo,
    }
  );

  return queryResult.repository.id;
}

async function transferIssues(destinationRepoId, issueIds) {
  console.log(
    `Transferring ${issueIds.length} issues to ${destinationRepoId}...`
  );

  let query = `mutation {`;

  for (let i = 0; i < issueIds.length; i++) {
    query += ` transferIssue${i}: transferIssue(input: { repositoryId: "${destinationRepoId}", issueId: "${issueIds[i]}" }) { clientMutationId }`;
  }

  query += `}`;

  console.log(query);

  try {
    const mutationResult = await graphql(query);
    console.log("result", mutationResult);
  } catch (error) {
    console.error("error", error);
    await new Promise((resolve) => setTimeout(resolve, 65000));
  }

  await new Promise((resolve) => setTimeout(resolve, 65000));
}
