// Mark GitHub notifications from one repository with reason `subscribed` read.
require("dotenv").config();
const request = require('request-promise-native');

if (process.argv.length !== 3) {
    console.log(`Usage: node unsubscribeFromNotification.js <owner>/<repository>`);
    console.log("Prereqs:\n* Run 'npm install dotenv request request-promise-native'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value.");
    return;
}

const nwo = process.argv[2];
console.log(`owner/repository: ${nwo}`);

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

    let notificationsMarkedRead = false;
    // stay on the same page if we mark notifications read.
    for (let page = 1; page < 9999; notificationsMarkedRead || page++) {
        const notificationsUrl = `https://api.github.com/repos/${nwo}/notifications?page=${page}`;
        const notifications = await request.get(notificationsUrl, args);

        if (notifications.length === 0) {
            console.log("No notifications returned.");
            console.log(notifications);
            break;
        }

        notificationsMarkedRead = false;
        for (const notification of notifications) {
            if (notification.reason === 'subscribed' && notification.unread) {
                console.log(notification.subject.title);
                console.log(notification.url);
                console.log();

                const patchArgs = {
                    body: {
                        unread: false,
                    },
                    headers: {
                    "User-Agent": "hashtagchris-github-util/0.1",
                    "Authorization": `Bearer ${process.env["GITHUB_PAT"]}`,
                    "Accept": "application/vnd.github.antiope-preview+json"
                    },
                    json: true
                };

                // Mark the notification read.
                const result = await request.patch(notification.url, patchArgs);
                console.log(result);
                notificationsMarkedRead = true;
            }
        }
    }
})();