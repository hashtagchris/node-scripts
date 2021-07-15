require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env["GITHUB_PAT"],
});

(async function() {
  for (let i = 0; i < 4; i++) {
    for (let letter = 97; letter < 123; letter++) {
      const title = `${Buffer.from([letter]).toString()}-${i}`;

      console.log(`Creating issue. title: ${title}`);
      await octokit.issues.create({
        owner: 'hashtagchris',
        repo: 'test-workflows',
        title,
      });
    }
  }
})();