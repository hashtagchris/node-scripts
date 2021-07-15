require("dotenv").config();
const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env["GITHUB_PAT"],
});

(async function() {
  const labels = ['incident-repair']
  const owner = 'github'
  const repo = 'c2c-actions-experience'

  const oneDayMS = 24 * 60 * 60 * 1000
  const weeklyClosedIssues = new Object()

  for (let page = 1; page < 10; page++) {
    const issuesResponse = await octokit.issues.listForRepo({
      owner,
      repo,
      labels,
      state: 'closed',
      page,
    });

    if (issuesResponse.data.length === 0) {
      break
    }

    for (const issue of issuesResponse.data) {
      if (issue.labels.some(l => l.name == 'Closed by stale')) {
        console.log(`closed by stale: ${issue.number}`)
        continue
      }

      const closedDate = new Date(issue.closed_at)
      let closedWeek = new Date(closedDate.getFullYear(), closedDate.getMonth(), closedDate.getDate())
      closedWeek = closedWeek.valueOf() - (closedWeek.getDay() * oneDayMS) + oneDayMS

      if (weeklyClosedIssues[closedWeek] === undefined) {
        weeklyClosedIssues[closedWeek] = []
      }

      weeklyClosedIssues[closedWeek].push(issue.number)
    }
  }

  console.log(`Repo: ${owner}/${repo}`)
  console.log(`Labels: ${labels}`)
  console.log()

  for (const week of Object.keys(weeklyClosedIssues).sort((a, b) => { return b - a})) {
    const weekDate = new Date(Number.parseInt(week))
    const weeklyIssues = weeklyClosedIssues[week].sort()
    console.log(`Week of ${weekDate.toDateString()}: ${weeklyIssues.length} issues closed (${weeklyIssues.join(', ')})`)
  }
})();
