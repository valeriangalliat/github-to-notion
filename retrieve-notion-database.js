#!/usr/bin/env node

import { Client } from '@notionhq/client'

if (process.argv.length < 3) {
  console.error('Usage: node retrieve-notion-database.js <database-id>')
  process.exit(1)
}

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const id = process.argv[2]

const notion = new Client({
  auth: token
})

const db = await notion.databases.retrieve({
  database_id: id
})

console.log(JSON.stringify(db, null, 2))
