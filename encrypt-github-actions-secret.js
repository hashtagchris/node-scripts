// https://docs.github.com/en/free-pro-team@latest/rest/reference/actions#create-or-update-an-organization-secret
require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const sodium = require('tweetsodium');
const readline = require('readline'); // Used for prompting the user.
const octokit = new Octokit({
  auth: process.env["GITHUB_PAT"],
});

if (process.argv.length !== 3) {
  console.log(`Usage:`);
  console.log(`Org: node encrypt-github-actions-secret org_name`);
  console.log(`Repo: node encrypt-github-actions-secret owner/repo_name`);
  console.log("Prereqs:\n* Run 'npm install'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value.");
  return;
}

const orgOrRepo = process.argv[2];

function readSecret(rl) {
  return new Promise((resolve) => {
      rl.question(`Enter your plaintext secret value: `, (answer) => {
          resolve(answer);
      });
  });
}

(async function() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const plaintextSecret = await readSecret(rl);

  let publicKey;
  if (orgOrRepo.includes("/")) {
    const { owner, repo } = orgOrRepo.split("/");

    console.log(`Fetching public key for ${owner}/${repo} repo...`);
    publicKey = await octokit.actions.getRepoPublicKey({
      owner,
      repo,
    });
  } else {
    const org = orgOrRepo;
    console.log(`Fetching public key for ${org} org...`);
    publicKey = await octokit.actions.getOrgPublicKey({
      org
    });
  }

  console.log(publicKey.data);

  const messageBytes = Buffer.from(plaintextSecret);
  const keyBytes = Buffer.from(publicKey.data.key, 'base64');
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  const encrypted = Buffer.from(encryptedBytes).toString('base64');

  console.log();
  console.log(`plaintext: ${plaintextSecret}`);
  console.log(`encrypted: ${encrypted}`);
  console.log(`key_id used: ${publicKey.data.key_id}`);

  rl.close();
})();
