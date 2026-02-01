// Database initialization script
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Ensure data directory exists
const dataDir = join(__dirname, '..', '..', 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
}
// Initialize the database
initializeDatabase();
console.log('🚀 PrimeSpace database ready!');
//# sourceMappingURL=init.js.map