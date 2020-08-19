const { AuthenticationContext } = require('adal-node');

exports.aquireToken = function(tenant, resource) {
  // Create a new authentication context.
  const context = new AuthenticationContext(`https://login.microsoftonline.com/${tenant}`);

  // The well-known clientId for Azure Powershell. Saves us the trouble of creating a new client and giving it
  // delegated permissions.
  const clientId = "1950a258-227b-4e31-a9cf-717495945fc2";
  const language = "en-us";

  return new Promise((resolve, reject) => {
    context.acquireUserCode(resource, clientId, language, (userCodeError, userCodeInfo) => {
      if (userCodeError) {
        reject(userCodeError);
        return;
      }

      // Prompt the user to sign in. "To sign in, use a web browser to open the page https://microsoft.com/devicelogin and enter the code ... to authenticate."
      console.log(userCodeInfo.message);

      context.acquireTokenWithDeviceCode(resource, clientId, userCodeInfo, (deviceCodeErr, tokenResponse) => {
        if (deviceCodeErr) {
          reject(deviceCodeErr);
          return;
        }

        resolve(tokenResponse);
      });
    });
  });
}

return exports