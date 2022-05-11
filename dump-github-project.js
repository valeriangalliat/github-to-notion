#!/usr/bin/env node

import { Octokit } from '@octokit/rest'

if (process.argv.length < 3) {
  console.error('Usage: node dump-github-project.js <project-url>')
  process.exit(1)
}

const token = process.env.GITHUB_TOKEN

if (!token) {
  console.error('Missing GITHUB_TOKEN in environment')
  process.exit(1)
}

const projectUrl = process.argv[2]
const parts = projectUrl.split('/')

if (parts[5] !== 'projects') {
  console.error('Not a GitHub project URL')
  process.exit(1)
}

const owner = parts[3]
const repo = parts[4]
const projectNumber = Number(parts[6])

const octokit = new Octokit({
  auth: token
})

const projects = await octokit.paginate(octokit.projects.listForRepo, {
  owner,
  repo,
  per_page: 100
})

const project = projects.find(project => project.number === projectNumber)

const columns = await octokit.paginate(octokit.projects.listColumns, {
  project_id: project.id,
  per_page: 100
})

project.columns = columns

console.error(`Found ${columns.length} columns`)

let notes = 0
let issues = 0
let commentsCount = 0

for (const column of columns) {
  const cards = await octokit.paginate(octokit.projects.listCards, {
    column_id: column.id,
    per_page: 100
  })

  column.cards = cards

  console.error(`  ${column.name}: ${cards.length} cards`)

  for (const card of cards) {
    if (!card.content_url) {
      notes += 1
      continue
    }

    const { data: issue } = await octokit.request(card.content_url)

    card.issue = issue
    issues += 1

    if (issue.comments < 1) {
      issue.comments = []
      continue
    }

    const comments = await octokit.paginate(issue.comments_url, { per_page: 100 })

    issue.comments = comments
    commentsCount += comments.length
  }
}

console.log(JSON.stringify(project, null, 2))

console.error(`Total ${notes} notes and ${issues} issues, including ${commentsCount} comments`)
