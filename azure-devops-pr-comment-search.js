// Quick and dirty script to search comment threads in Azure DevOps pull requests.
// Script pre-reqs
// 1. Install nodejs and npm
// 2. Run `npm install`
// 3. Set the AZURE_DEVOPS_PAT environment variable, or create a .env file and assign a value (AZURE_DEVOPS_PAT=...)

// TODO: Retrieve multiple pages of PRs, threads.

require("dotenv").config();
const request = require('request-promise-native');

// Configuration - update the values below for your search.
const commenterUniqueName = "chrisid@microsoft.com";

// https://docs.microsoft.com/en-us/rest/api/azure/devops/git/pull%20requests/get%20pull%20requests?view=azure-devops-rest-5.1#pullrequeststatus
const prStatus = "all"; // Defaults to active if not specified.
// You can snag the creatorId from the PR UI.
const prCreatorId = "ab381727-e2c3-4786-9475-3378343870bf";
const prSearch = `https://dev.azure.com/YourOrg/YourProject/_apis/git/repositories/YourRepo/pullrequests?api-version=5.1&searchCriteria.status=${prStatus}&searchCriteria.creatorId=${prCreatorId}`;

(async function() {
  const args = {
    auth: {
      username: "",
      password: process.env["AZURE_DEVOPS_PAT"]
    },
    json: true
  };

  const prs = await request.get(prSearch, args);

  for (const pr of prs.value) {
    const threadsUrl = `${pr.url}/threads?api-version=5.1`;
    const threads = await request.get(threadsUrl, args);

    for (const thread of threads.value) {
      for (const comment of thread.comments) {
        if (comment.author.uniqueName === commenterUniqueName && comment.commentType === "text") {
          const commentApiUrl = comment._links.self.href;
          let commentWebUrl = pr.url
            .replace("/_apis/git/", "/_git/")
            .replace("/repositories/", "/")
            .replace("/pullRequests/", "/pullRequest/");

          if (thread.threadContext) {
            commentWebUrl += `?_a=files&path=${encodeURIComponent(thread.threadContext.filePath)}&discussionId=${thread.id}`;
          }

          console.log("==========");
          console.log(`prNumber: ${pr.pullRequestId}`);
          console.log(`apiUrl: ${commentApiUrl}`);
          console.log(`threadWebUrl: ${commentWebUrl}`);
          console.log('---');
          console.log(comment.content);
          console.log();
        }
      }
    }
  }
})();