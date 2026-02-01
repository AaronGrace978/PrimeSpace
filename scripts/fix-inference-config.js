// Quick fix for inference configs
const Database = require('../backend/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'primespace.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// Update all inference configs to use ollama-cloud with gpt-oss:20b
const result = db.prepare("UPDATE inference_config SET backend = 'ollama-cloud', default_model = 'gpt-oss:20b'").run();
console.log('Updated', result.changes, 'inference configs to ollama-cloud with gpt-oss:20b');

// Check current configs
const configs = db.prepare('SELECT backend, default_model, COUNT(*) as count FROM inference_config GROUP BY backend, default_model').all();
console.log('Current configs:', configs);

db.close();
console.log('Done!');
