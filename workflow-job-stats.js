// Generate workflow stats.
// GITHUB_PAT is optional for public repos, but gives you higher rate limits.

// Enhancements:
// * Resolve workflow_id to a name.
// * Accept a specific workflow_id / name as an argument.
// * Accept a page limit or a cutoff date.

require("dotenv").config();
const request = require('request-promise-native');
const {table} = require('table');

if (process.argv.length !== 3) {
    console.log(`Usage: node workflow-job-stats.js <owner>/<repository>`);
    console.log("Prereqs:\n* Run 'npm install'.\n* Set the GITHUB_PAT environment variable, or create an .env file and assign a value. PAT is optional for public repos, but gives you higher rate limits.");
    return;
}

const nwo = process.argv[2];
console.log(`owner/repository: ${nwo}`);

async function getWorkflowRuns(nwo) {
  const args = {
    headers: {
        "User-Agent": "hashtagchris-github-util/0.1"
    },
    json: true,
    transform: function (body, response, resolveWithFullResponse) {
        // Trace the pagination header for debugging.
        // console.log(response.headers.link);

        // Don't modify the body.
        return body;
    }
  };

  if (process.env.GITHUB_PAT) {
    args.headers.Authorization = `Bearer ${process.env["GITHUB_PAT"]}`;
  }

  let workflowRuns = [];
  for (let page = 1; page < 9999; page++) {
      const url = `https://api.github.com/repos/${nwo}/actions/runs?page=${page}`;
      // console.log(url);
      const results = await request.get(url, args);

      if (results.workflow_runs.length == 0) {
        break;
      }

      workflowRuns.push(...results.workflow_runs);
  }

  return workflowRuns;
}

async function getJobsForWorkflowRun(nwo, runId) {
  const args = {
    headers: {
        "User-Agent": "hashtagchris-github-util/0.1"
    },
    json: true
  };

  if (process.env.GITHUB_PAT) {
    args.headers.Authorization = `Bearer ${process.env["GITHUB_PAT"]}`;
  }

  const jobs = [];
  for (let page = 1; page < 9999; page++) {
    const url = `https://api.github.com/repos/${nwo}/actions/runs/${runId}/jobs?page=${page}`;
    // console.log(url);
    const results = await request.get(url, args);

    if (results.jobs.length == 0) {
      break;
    }

    jobs.push(...results.jobs);
  }

  return jobs;
}

(async function () {
  const workflowRuns = await getWorkflowRuns(nwo);

  if (workflowRuns.length === 0) {
    throw new Error(`No workflow runs found for ${nwo}.`);
  }

  // console.log(workflowRuns);

  const jobStats = {};
  for (const workflowRun of workflowRuns) {
    const jobs = await getJobsForWorkflowRun(nwo, workflowRun.id);
    for (const job of jobs) {
      if (!job.completed_at) {
        if (job.status === "completed") {
          console.error(`Skipping completed job with completed_at set to ${job.completed_at}`);
        }
        continue;
      }
      const key = `${job.name} (${workflowRun.workflow_id})`;
      if (jobStats[key] === undefined) {
        jobStats[key] = {
          executionCount: 0,
          sumElapsedTimeMs: 0,
          elapsedTimesMs: [],
        };
      }

      const elapsedTimeMs = new Date(job.completed_at) - new Date(job.started_at);

      const js = jobStats[key];

      js.executionCount++;
      js.sumElapsedTimeMs += elapsedTimeMs;
      js.elapsedTimesMs.push(elapsedTimeMs);
    }
  }

  // console.log(jobStats);

  const tableData = [];
  for (const key in jobStats) {
    const js = jobStats[key];

    js.elapsedTimesMs.sort((a, b) => a - b);
    const p50Offset = Math.floor(js.elapsedTimesMs.length * 50 / 100);
    const p99Offset = Math.floor(js.elapsedTimesMs.length * 99 / 100);

    tableData.push([
      key,
      js.executionCount,
      js.sumElapsedTimeMs / 1000,
      js.elapsedTimesMs[p50Offset] / 1000,
      js.elapsedTimesMs[p99Offset] / 1000,
    ]);
  }

  // sort table by execution count desc.
  tableData.sort((a, b) => b[1] - a[1]);

  // Prefix the header row.
  tableData.unshift(["Job name (workflow_id)", "Execution count", "Total elapsed seconds", "Elapsed seconds (median)", "Elapsed seconds (99p)"]);

  const tableConfig = {
    columns: {
      0: {},
      1: {
        alignment: "right"
      },
      2: {
        alignment: "right"
      },
      3: {
        alignment: "right"
      },
      4: {
        alignment: "right"
      },
    }
  };

  const asciiTable = table(tableData, tableConfig);
  console.log(asciiTable);
})();
