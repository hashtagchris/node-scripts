const deviceAuth = require("./lib/deviceAuth.js");

// The resourceId for Kusto (a/k/a Azure Data Explorer) in Azure Active Directory.
// Source: https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/services-support-managed-identities#azure-key-vault
const resource = "https://vault.azure.net";

if (process.argv.length !== 3) {
  console.log(`Usage: node key-vault <aad-tenant>`);
  console.log("Try 'common' if you don't know which AAD tenant you're targetting.");
  return;
}

const tenant = process.argv[2];

(async function main() {
  try {
    const token = await deviceAuth.aquireToken(tenant, resource);
    console.log(token);
  }
  catch (error) {
    console.error(error);
  }
})()
