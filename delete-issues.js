require("dotenv").config();
const graphql = require("@octokit/graphql").graphql.defaults({
  headers: {
    authorization: `token ${process.env["GITHUB_PAT"]}`
  }
});

if (process.argv.length !== 5) {
  console.log(`Usage: node delete-issues nwo start-issue-number end-issue-number`);
  console.log("Prereqs:\n* Run 'npm install'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value.");
  return;
}

const nwo = process.argv[2];
const startIssueNumber = parseInt(process.argv[3]);
const endIssueNumber = parseInt(process.argv[4]);

const [ owner, repo ] = nwo.split("/");

if (!owner || !repo || !startIssueNumber || !endIssueNumber) {
  throw new Error("Couldn't parse args");
}

(async function() {
  for (let issueNumber = startIssueNumber; issueNumber <= endIssueNumber; issueNumber++) {
    console.log();
    let issue;
    try {
      const queryResult = await graphql(`
        query($owner: String!, $repo: String!, $issueNumber: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $issueNumber) {
              id
              title
              number
            }
          }
        }
      `, {
        owner,
        repo,
        issueNumber,
      });

      issue = queryResult.repository.issue;
    }
    catch (error) {
      console.error(error);
      continue;
    }

    if (!issue.id) {
      console.log(`Issue ${issueNumber} not found. Skipping deletion.`);
      continue;
    }

    console.log(`Deleting issue #${issue.number} (${issue.id}, ${issue.title})...`);
    const mutationResult = await graphql(`
    mutation($issueId: ID!) {
      deleteIssue(input: { issueId: $issueId }) {
        clientMutationId
        __typename
        repository {
          nameWithOwner
        }
      }
    }`, {
      issueId: issue.id,
  });

    console.log(mutationResult);
  }
})();