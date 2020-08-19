const deviceAuth = require("./lib/deviceAuth.js");

if (process.argv.length !== 4) {
  console.log(`Usage: node key-vault <aad-tenant> <kusto-cluster-name>`);
  console.log("Try 'common' if you don't know which AAD tenant you're targetting.");
  return;
}

const tenant = process.argv[2];

// The resourceId for Kusto (a/k/a Azure Data Explorer) in Azure Active Directory.
// Source: https://docs.microsoft.com/en-us/azure/data-explorer/kusto/api/rest/authentication
const resource = `https://${process.argv[3]}.kusto.windows.net`;

(async function main() {
  try {
    const token = await deviceAuth.aquireToken(tenant, resource);
    console.log(token);
  }
  catch (error) {
    console.error(error);
  }
})()
