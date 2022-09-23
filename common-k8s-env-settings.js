#!/usr/bin/env node

// find kubernetes/*/deployment/* | xargs ./common-k8s-env-settings.js > env-settings.log

const YAML = require("yaml")
const fs = require("fs")

if (process.argv.length < 4) {
  console.log(`Usage: node common-k8s-env-settings.js <file-1> <file-2> ...`)
  return
}

const paths = []
for (let i = 2; i < process.argv.length; i++) {
  paths.push(process.argv[i])
}

const envSettingCounts = {}

for (const path of paths) {
  debug(`Path: ${path}`)

  const yamlText = fs.readFileSync(path, 'utf8')
  const doc = YAML.parse(yamlText)
  for (const container of doc.spec.template.spec.containers) {
    debug(`  Container: ${container.name}`)

    for (const envSetting of container.env) {
      debug(`    ${envSetting.name}`)
      envSettingCounts[envSetting.name] = (envSettingCounts[envSetting.name] ?? 0) + 1
    }
  }
}

for (const [key, value] of Object.entries(envSettingCounts)) {
  if (value === paths.length) {
    console.log(key)
  }
}

function debug(msg) {
  console.log(msg)
}