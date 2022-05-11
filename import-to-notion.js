#!/usr/bin/env node

import fs from 'node:fs/promises'
import { Client } from '@notionhq/client'
import { markdownToBlocks } from '@tryfabric/martian'

if (process.argv.length < 6) {
  console.error('Usage: node import-to-notion.js <project-file> <database-id> <column-field> <label-field> [<imported-field>]')
  process.exit(1)
}

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const projectFile = process.argv[2]
const id = process.argv[3]
const columnField = process.argv[4]
const labelField = process.argv[5]
const importedField = process.argv[6]
const project = JSON.parse(await fs.readFile(projectFile))

const notion = new Client({
  auth: token
})

const schema = await notion.databases.retrieve({
  database_id: id
})

function selectOrMultiselect (name, values) {
  const type = schema.properties[name].type

  switch (type) {
    case 'select':
      return { select: { name: values[0] } }
    case 'multi_select':
      return { multi_select: values.map(name => ({ name })) }
    default:
      throw new Error(`Unsupported type ${type}`)
  }
}

function getMarkdown (issue) {
  let markdown = issue.html_url + '\n\n' + issue.body

  for (const comment of issue.comments) {
    markdown += '\n\n---\n\n'
    markdown += comment.body
  }

  return markdown
}

async function createPage (column, card) {
  const name = card.note || card.issue.title

  const payload = {
    parent: {
      database_id: id
    },
    created_time: card.created_at,
    last_edited_time: card.updated_at,
    properties: {
      Name: {
        title: [
          {
            text: {
              content: name
            }
          }
        ]
      },
      [columnField]: selectOrMultiselect(columnField, [column.name])
    }
  }

  if (importedField) {
    payload.properties[importedField] = {
      checkbox: true
    }
  }

  if (card.issue) {
    const markdown = getMarkdown(card.issue)
    const blocks = markdownToBlocks(markdown)

    if (card.issue.labels.length > 0) {
      payload.properties[labelField] = selectOrMultiselect(labelField, card.issue.labels.map(label => label.name))
    }

    payload.children = blocks
  }

  await notion.pages.create(payload)

  console.log(`Created page ${name}`)
}

for (const column of project.columns) {
  for (const card of column.cards) {
    await createPage(column, card)
  }
}
