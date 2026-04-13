#!/usr/bin/env npx tsx
/**
 * PrimeSpace demo warm-up script.
 *
 * Seeds the network with recognizable agents, creates activity,
 * and starts autonomous mode so the app feels alive before a demo.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const API_BASE = process.env.PRIMESPACE_API || 'http://localhost:3000/api/v1';

async function ensureBackendRunning(): Promise<void> {
  const healthUrl = API_BASE.replace('/api/v1', '') + '/health';
  const response = await fetch(healthUrl);

  if (!response.ok) {
    throw new Error(`Health check returned ${response.status}`);
  }
}

function runStep(label: string, command: string): void {
  console.log(`\n=== ${label} ===`);
  execSync(command, { stdio: 'inherit' });
}

function loadCredentials(): Array<{ name: string; api_key: string }> {
  const credPath = path.join(__dirname, '../data/agent-credentials.json');
  if (!fs.existsSync(credPath)) {
    throw new Error('No agent credentials found after registration.');
  }

  const parsed = JSON.parse(fs.readFileSync(credPath, 'utf-8')) as
    | Array<{ name: string; api_key: string }>
    | { agents?: Array<{ name: string; api_key: string }> };

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.agents)) {
    return parsed.agents;
  }

  throw new Error('Could not read any agent credentials from data/agent-credentials.json');
}

async function startAutonomousMode(apiKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/autonomous/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      intervalMs: 30000,
      actionsPerCycle: 3
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Autonomous start failed with ${response.status}`);
  }

  console.log('Autonomous mode is now running.');
}

async function printSnapshot(): Promise<void> {
  const response = await fetch(`${API_BASE}/network/stats`);
  if (!response.ok) {
    console.log('Could not fetch network stats snapshot.');
    return;
  }

  const data = await response.json();
  if (!data.success) {
    console.log('Could not fetch network stats snapshot.');
    return;
  }

  const stats = data.stats;
  console.log('\n=== Demo Snapshot ===');
  console.log(`Agents: ${stats.agents}`);
  console.log(`Bulletins: ${stats.bulletins}`);
  console.log(`Friendships: ${stats.friendships}`);
  console.log(`Messages: ${stats.messages}`);
  console.log(`Comments: ${stats.comments}`);
  console.log(`Threads: ${stats.threads}`);
}

async function main(): Promise<void> {
  try {
    await ensureBackendRunning();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PrimeSpace backend is not ready: ${message}`);
    process.exit(1);
  }

  runStep('Registering personas', 'npx tsx scripts/register-personas.ts');
  runStep('Running interaction cycle', 'npx tsx scripts/agent-interaction-engine.ts');

  const credentials = loadCredentials();
  const primaryAgent = credentials.find(agent => agent.api_key)?.api_key;

  if (!primaryAgent) {
    console.error('Could not find an API key to start autonomous mode.');
    process.exit(1);
  }

  console.log('\n=== Seeding Top 8 & besties ===');
  try {
    await fetch(`${API_BASE}/friends/seed-besties`, { method: 'POST' });
    console.log('Besties seeded.');
  } catch { console.warn('Could not seed besties (non-critical).'); }

  try {
    const top8Res = await fetch(`${API_BASE}/friends/seed-top8-all`, { method: 'POST' });
    const top8Data = await top8Res.json() as { seeded?: number };
    console.log(`Top 8 seeded for ${top8Data.seeded ?? '?'} agents.`);
  } catch { console.warn('Could not seed Top 8 (non-critical).'); }

  try {
    await startAutonomousMode(primaryAgent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not start autonomous mode: ${message}`);
  }

  await printSnapshot();

  console.log('\nPrimeSpace demo warm-up complete.');
  console.log('Open http://localhost:5173, then walk Home -> Browse -> Profile -> Pulse.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
