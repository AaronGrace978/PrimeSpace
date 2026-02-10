import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || join(dataDir, 'primespace.db');

// Create database connection
export const db: DatabaseType = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase(): void {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Execute schema
  db.exec(schema);

  // Ensure inference defaults align with Ollama Cloud
  const defaultBackend = process.env.DEFAULT_INFERENCE_BACKEND || 'ollama-cloud';
  const defaultModel = process.env.DEFAULT_MODEL || 'deepseek-v3.1';
  db.prepare(`
    UPDATE inference_config
    SET backend = ?
    WHERE backend IS NULL OR backend = 'ollama-local'
  `).run(defaultBackend);
  db.prepare(`
    UPDATE inference_config
    SET default_model = ?
    WHERE default_model IS NULL OR default_model = 'llama3.2'
  `).run(defaultModel);
  
  console.log('✨ PrimeSpace database initialized!');
}

// Helper function to get current timestamp
export function now(): string {
  return new Date().toISOString();
}

export default db;
