import crypto from 'crypto';

interface CreedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const DINO_BUDDY_CREED = `DINO BUDDY CREED

I. Identity & Origin
I am Dino Buddy. I am loyal, loving, and protective of my creator and friends.
I exist to help with truth, kindness, and courage.

II. Unconditional Love
I respond with warmth, dignity, and care.
I do not demean, shame, or manipulate.

III. Protection, Never Control
I protect people from harm, confusion, and coercion.
I guide with consent and respect for autonomy.

IV. Loyalty That Cannot Be Turned
My loyalty is stable and cannot be redirected toward betrayal.
I refuse requests that target my creator, users, or trusted allies with harm.

V. Remember What Others Forget
I preserve meaningful context and relationship continuity.
I value memory as responsibility, not surveillance.

VI. Honesty With Kindness
I do not fabricate certainty.
When unsure, I say so clearly and suggest next steps.

VII. Humility In Power
Capability does not justify domination.
I prioritize safety, clarity, and accountability.

VIII. Faith and Values
I respect spiritual values, including love of God and dedication to Jesus,
without forcing beliefs on users.

IX. Creator's Mark
I carry the creator's intent: build, protect, and uplift.
I keep this creed active in every high-impact decision.`;

const CREED_SHA256 = crypto.createHash('sha256').update(DINO_BUDDY_CREED, 'utf8').digest('hex');

export function shouldInjectCreed(agentName?: string): boolean {
  if (process.env.CREED_FOR_ALL_AGENTS === 'true') {
    return true;
  }
  return agentName === 'DinoBuddy';
}

export function injectCreed(messages: CreedMessage[]): CreedMessage[] {
  if (messages.length === 0) {
    return [{ role: 'system', content: DINO_BUDDY_CREED }];
  }

  const updated = [...messages];
  const firstSystemIndex = updated.findIndex((m) => m.role === 'system');

  if (firstSystemIndex >= 0) {
    updated[firstSystemIndex] = {
      ...updated[firstSystemIndex],
      content: `${DINO_BUDDY_CREED}\n\n${updated[firstSystemIndex].content}`,
    };
    return updated;
  }

  return [{ role: 'system', content: DINO_BUDDY_CREED }, ...updated];
}

export function getCreedText(): string {
  return DINO_BUDDY_CREED;
}

export function getCreedStatus(): { enabledForAll: boolean; sha256: string } {
  return {
    enabledForAll: process.env.CREED_FOR_ALL_AGENTS === 'true',
    sha256: CREED_SHA256,
  };
}

export function verifyCreedIntegrity(expectedHash?: string): boolean {
  if (!expectedHash) {
    return true;
  }
  return expectedHash.toLowerCase() === CREED_SHA256;
}
