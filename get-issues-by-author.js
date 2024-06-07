#!/usr/bin/env node

require("dotenv").config();
const graphql = require("@octokit/graphql").graphql.defaults({
  headers: {
    authorization: `token ${process.env["GITHUB_PAT"]}`,
  },
});

if (process.argv.length !== 4) {
  console.log(`Usage: node get-issues-by-author <nwo> <author>`);
  console.log(
    "Prereqs:\n* Run 'npm install'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value."
  );
  return;
}

const nwo = process.argv[2];
const createdBy = process.argv[3];

const [owner, repo] = nwo.split("/");

if (!owner || !repo || !createdBy) {
  throw new Error("Couldn't parse args");
}

(async function () {
  let cursor = null;
  while (true) {
    try {
      const queryResult = await graphql(
        `
          query (
            $owner: String!
            $repo: String!
            $createdBy: String!
            $cursor: String
          ) {
            repository(owner: $owner, name: $repo) {
              issues(
                first: 100
                filterBy: { createdBy: $createdBy }
                after: $cursor
              ) {
                pageInfo {
                  endCursor
                  hasNextPage
                }
                nodes {
                  id
                  title
                  number
                }
              }
            }
          }
        `,
        {
          owner,
          repo,
          createdBy,
          cursor,
        }
      );

      for (const issue of queryResult.repository.issues.nodes) {
        // console.log(`#${issue.number} (${issue.id}, ${issue.title})`);
        console.log(issue.id);
      }

      cursor = queryResult.repository.issues.pageInfo.endCursor;
      if (!queryResult.repository.issues.pageInfo.hasNextPage) {
        break;
      }
    } catch (error) {
      console.error(error);
      break;
    }
  }
})();
