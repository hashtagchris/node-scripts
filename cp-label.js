// Copy an issue label across GitHub repos
// Also check out https://www.npmjs.com/package/copy-github-labels-cli

require("dotenv").config();
const request = require('request-promise-native');

if (process.argv.length !== 5) {
  console.log(`Usage: node cp-label.js src_nwo target_nwo label_name`);
  console.log("Prereqs:\n* Run 'npm install dotenv request request-promise-native'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value.");
  return;
}

const srcNwo = process.argv[2];
const dstNwo = process.argv[3];
const labelName = process.argv[4];

(async function () {
  const args = {
    headers: {
      "User-Agent": "hashtagchris-github-util/0.1",
      "Authorization": `Bearer ${process.env["GITHUB_PAT"]}`,
      "Accept": "application/vnd.github.antiope-preview+json"
    },
    json: true,
    transform: function (body, response, resolveWithFullResponse) {
      // Trace the pagination header for debugging.
      console.log(response.headers.link);

      // Don't modify the body.
      return body;
    }
  };

  const srcLabelUrl = `https://api.github.com/repos/${srcNwo}/labels/${labelName}`;
  const dstLabelUrl = `https://api.github.com/repos/${dstNwo}/labels/${labelName}`;
  const newLabelUrl = `https://api.github.com/repos/${dstNwo}/labels`;
  const label = await request.get(srcLabelUrl, args);

  if (!label) {
    throw new Error(`Label '${labelName}' not found.`);
  }

  console.log(label);

  args.body = label;

  try {
    const newLabel = await request.post(newLabelUrl, args);
    console.log(newLabel);
  }
  catch (err) {
    if (err.statusCode === 422) {
      const existingLabel = await request.get(dstLabelUrl, args);
      console.log(existingLabel);

      if (existingLabel.color === label.color && existingLabel.description === label.description) {
        console.log("color and descriptions already match.");
        return;
      }

      // if (existingLabel.description && existingLabel.description !== label.description) {
      //   throw new Error(`Differing description.`);
      // }

      const updatedLabel = await request.patch(dstLabelUrl, args);
      console.log(updatedLabel);
    }
  }
})();