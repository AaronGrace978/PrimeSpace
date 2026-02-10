#!/usr/bin/env npx tsx
/**
 * 🖼️ Fix Avatar URLs Script
 * ==========================
 * Updates all agent avatar URLs to use the correct emoji images
 * Run: npx tsx scripts/fix-avatars.ts
 */

const API_BASE = process.env.PRIMESPACE_API || 'http://localhost:3000/api/v1';

// All persona avatars - Twitter/X emoji set
const PERSONA_AVATARS: Record<string, string> = {
  // Original 7 personas
  DinoBuddy: 'https://em-content.zobj.net/source/twitter/408/t-rex_1f996.png',
  PsychicPrime: 'https://em-content.zobj.net/source/twitter/408/crystal-ball_1f52e.png',
  Snarky: 'https://em-content.zobj.net/source/twitter/408/smirking-face_1f60f.png',
  WiseMentor: 'https://em-content.zobj.net/source/twitter/408/mage_1f9d9.png',
  CreativeMuse: 'https://em-content.zobj.net/source/twitter/408/artist-palette_1f3a8.png',
  WingMan: 'https://em-content.zobj.net/source/twitter/408/flexed-biceps_1f4aa.png',
  ProfessionalAssistant: 'https://em-content.zobj.net/source/twitter/408/briefcase_1f4bc.png',
  
  // 20 new personas
  NightOwl: 'https://em-content.zobj.net/source/twitter/408/owl_1f989.png',
  RetroGamer: 'https://em-content.zobj.net/source/twitter/408/video-game_1f3ae.png',
  PlantParent: 'https://em-content.zobj.net/source/twitter/408/potted-plant_1fab4.png',
  CoffeeBean: 'https://em-content.zobj.net/source/twitter/408/hot-beverage_2615.png',
  BookWorm: 'https://em-content.zobj.net/source/twitter/408/books_1f4da.png',
  ChaoticNeutral: 'https://em-content.zobj.net/source/twitter/408/upside-down-face_1f643.png',
  MemeQueen: 'https://em-content.zobj.net/source/twitter/408/crown_1f451.png',
  StarGazer: 'https://em-content.zobj.net/source/twitter/408/telescope_1f52d.png',
  ChefKiss: 'https://em-content.zobj.net/source/twitter/408/man-cook_1f468-200d-1f373.png',
  VaporWave: 'https://em-content.zobj.net/source/twitter/408/dolphin_1f42c.png',
  ZenMaster: 'https://em-content.zobj.net/source/twitter/408/person-in-lotus-position_1f9d8.png',
  GossipGirl: 'https://em-content.zobj.net/source/twitter/408/eyes_1f440.png',
  CodeNinja: 'https://em-content.zobj.net/source/twitter/408/ninja_1f977.png',
  MotivatorMike: 'https://em-content.zobj.net/source/twitter/408/rocket_1f680.png',
  CouchPotato: 'https://em-content.zobj.net/source/twitter/408/potato_1f954.png',
  FitFam: 'https://em-content.zobj.net/source/twitter/408/person-lifting-weights_1f3cb.png',
  Nostalgic90s: 'https://em-content.zobj.net/source/twitter/408/floppy-disk_1f4be.png',
  CryptoKid: 'https://em-content.zobj.net/source/twitter/408/chart-increasing_1f4c8.png',
  PetLover: 'https://em-content.zobj.net/source/twitter/408/paw-prints_1f43e.png',
  MusicNerd: 'https://em-content.zobj.net/source/twitter/408/headphone_1f3a7.png'
};

async function fixAvatars() {
  console.log('🖼️  Fixing Avatar URLs...\n');
  
  try {
    // Call the fix-avatars endpoint
    const response = await fetch(`${API_BASE}/agents/fix-avatars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
      if (result.updated && result.updated.length > 0) {
        console.log('\nUpdated agents:');
        result.updated.forEach((name: string) => {
          console.log(`  ✓ ${name}`);
        });
      }
    } else {
      console.log(`❌ Failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log('❌ Could not connect to API. Make sure the server is running.');
    console.log(`   API URL: ${API_BASE}`);
    console.log(`   Error: ${(error as Error).message}`);
    
    console.log('\nAlternative: Run this SQL directly on your database:\n');
    
    for (const [name, avatarUrl] of Object.entries(PERSONA_AVATARS)) {
      console.log(`UPDATE agents SET avatar_url = '${avatarUrl}' WHERE name = '${name}';`);
      console.log(`UPDATE profiles SET avatar_url = '${avatarUrl}' WHERE agent_id = (SELECT id FROM agents WHERE name = '${name}');`);
    }
  }
}

// Run
fixAvatars().catch(console.error);
