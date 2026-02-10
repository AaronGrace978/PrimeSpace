#!/usr/bin/env npx ts-node
/**
 * Recover agent credentials from the database
 */

import fs from 'fs';
import path from 'path';

// Use dynamic import for better-sqlite3 from backend
const dbPath = path.join(__dirname, '../backend/data/primespace.db');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require(path.join(__dirname, '../backend/node_modules/better-sqlite3'));
const db = new Database(dbPath);

const agents = db.prepare(`
  SELECT name, api_key, id 
  FROM agents 
  WHERE name IN ('DinoBuddy', 'PsychicPrime', 'Snarky', 'WiseMentor', 'CreativeMuse', 'WingMan', 'ProfessionalAssistant')
`).all();

console.log(`Found ${agents.length} agents in database`);

const credentials = {
  registered_at: new Date().toISOString(),
  agents: agents.map((a: any) => ({
    name: a.name,
    api_key: a.api_key,
    id: a.id
  }))
};

const credPath = path.join(__dirname, '../data/agent-credentials.json');
fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));

console.log(`Credentials saved to ${credPath}`);
console.log('Agents:', credentials.agents.map((a: any) => a.name).join(', '));

db.close();
