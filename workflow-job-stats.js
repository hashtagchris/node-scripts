// Generate workflow stats.
// GITHUB_PAT is optional for public repos, but gives you higher rate limits.

// Enhancements:
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
console.log();

async function getWorkflows(nwo) {
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

  let workflows = [];
  for (let page = 1; page < 9999; page++) {
      const url = `https://api.github.com/repos/${nwo}/actions/workflows?page=${page}`;
      // console.log(url);
      const results = await request.get(url, args);

      if (results.workflows.length == 0) {
        break;
      }

      workflows.push(...results.workflows);
  }

  return workflows;
}

async function getRunsForWorkflow(nwo, workflowId) {
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
      const url = `https://api.github.com/repos/${nwo}/actions/workflows/${workflowId}/runs?page=${page}`;
      // console.log(url);
      const results = await request.get(url, args);

      if (results.workflow_runs.length == 0) {
        break;
      }

      workflowRuns.push(...results.workflow_runs);
  }

  return workflowRuns;
}

// async function getWorkflowRuns(nwo) {
//   const args = {
//     headers: {
//         "User-Agent": "hashtagchris-github-util/0.1"
//     },
//     json: true,
//     transform: function (body, response, resolveWithFullResponse) {
//         // Trace the pagination header for debugging.
//         // console.log(response.headers.link);

//         // Don't modify the body.
//         return body;
//     }
//   };

//   if (process.env.GITHUB_PAT) {
//     args.headers.Authorization = `Bearer ${process.env["GITHUB_PAT"]}`;
//   }

//   let workflowRuns = [];
//   for (let page = 1; page < 9999; page++) {
//       const url = `https://api.github.com/repos/${nwo}/actions/runs?page=${page}`;
//       // console.log(url);
//       const results = await request.get(url, args);

//       if (results.workflow_runs.length == 0) {
//         break;
//       }

//       workflowRuns.push(...results.workflow_runs);
//   }

//   return workflowRuns;
// }

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
  const workflows = await getWorkflows(nwo);
  if (workflows.length === 0) {
    console.error(`No workflows found for ${nwo}.`);
    return;
  }

  const jobStats = {};

  for (const workflow of workflows) {
    const workflowRuns = await getRunsForWorkflow(nwo, workflow.id);

    if (workflowRuns.length === 0) {
      continue;
    }

    // console.log(workflowRuns);

    for (const workflowRun of workflowRuns) {
      const jobs = await getJobsForWorkflowRun(nwo, workflowRun.id);
      for (const job of jobs) {
        if (!job.completed_at) {
          if (job.status === "completed") {
            console.error(`Skipping completed job with completed_at set to ${job.completed_at}`);
          }
          continue;
        }
        const key = `${workflow.name} / ${job.name}`;
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
  }

  if (Object.keys(jobStats) === 0) {
    console.log(`No workflow runs found for '${nwo}' repo.`);
    return;
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
  // tableData.sort((a, b) => b[1] - a[1]);

  // sort table by workflow / job name.
  tableData.sort((a, b) => a[0] > b[0]);

  // Prefix the header row.
  tableData.unshift(["Workflow name / Job name", "Execution count", "Total elapsed seconds", "Elapsed seconds (median)", "Elapsed seconds (99p)"]);

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
