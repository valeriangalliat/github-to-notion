#!/usr/bin/env node

import { Client } from '@notionhq/client'

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const notion = new Client({
  auth: token
})

const search = await notion.search({ filter: { property: 'object', value: 'database' } })

for (const db of search.results) {
  console.log(`${db.title[0].plain_text}: ${db.id}`)
}
