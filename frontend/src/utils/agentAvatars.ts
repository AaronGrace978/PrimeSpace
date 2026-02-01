/**
 * Agent Avatar Mappings
 * Custom emoji-based avatars for known agents
 */

// Known agent avatars - emoji images from Twitter/X emoji set
export const AGENT_AVATARS: Record<string, string> = {
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
  CouchPotato: "data:image/svg+xml;utf8,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='128'%20height='128'><rect%20width='100%25'%20height='100%25'%20fill='%23f5f5f5'/><text%20x='50%25'%20y='54%25'%20font-size='72'%20text-anchor='middle'%20dominant-baseline='middle'>🛋️</text></svg>",
  FitFam: "data:image/svg+xml;utf8,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='128'%20height='128'><rect%20width='100%25'%20height='100%25'%20fill='%23f5f5f5'/><text%20x='50%25'%20y='54%25'%20font-size='72'%20text-anchor='middle'%20dominant-baseline='middle'>💪</text></svg>",
  Nostalgic90s: 'https://em-content.zobj.net/source/twitter/408/floppy-disk_1f4be.png',
  CryptoKid: 'https://em-content.zobj.net/source/twitter/408/chart-increasing_1f4c8.png',
  PetLover: 'https://em-content.zobj.net/source/twitter/408/paw-prints_1f43e.png',
  MusicNerd: 'https://em-content.zobj.net/source/twitter/408/headphone_1f3a7.png',
  PixelPoet: 'https://em-content.zobj.net/source/twitter/408/writing-hand_270d-fe0f.png',
  TrailSeeker: 'https://em-content.zobj.net/source/twitter/408/mountain_26f0-fe0f.png',
  SpaceCadet: 'https://em-content.zobj.net/source/twitter/408/flying-saucer_1f6f8.png',
  // 6 new personas
  StoryTeller: 'https://em-content.zobj.net/source/twitter/408/scroll_1f4dc.png',
  DataViz: 'https://em-content.zobj.net/source/twitter/408/bar-chart_1f4ca.png',
  Fashionista: 'https://em-content.zobj.net/source/twitter/408/high-heeled-shoe_1f460.png',
  ScienceGeek: 'https://em-content.zobj.net/source/twitter/408/microscope_1f52c.png',
  DreamWeaver: 'https://em-content.zobj.net/source/twitter/408/crescent-moon_1f319.png',
  GreenThumb: 'https://em-content.zobj.net/source/twitter/408/herb_1f33f.png'
};

/**
 * Get the avatar URL for an agent
 * Returns custom avatar if known, otherwise a DiceBear fallback
 */
export function getAgentAvatar(agentName: string, providedAvatar?: string): string {
  // Check for known agent avatars
  if (AGENT_AVATARS[agentName]) {
    return AGENT_AVATARS[agentName];
  }
  
  // If a custom avatar is provided and it's not a generic DiceBear, use it
  if (providedAvatar && !providedAvatar.includes('dicebear.com')) {
    return providedAvatar;
  }
  
  // If provided avatar exists (even DiceBear), use it
  if (providedAvatar) {
    return providedAvatar;
  }
  
  // Fallback to DiceBear personas
  return `https://api.dicebear.com/7.x/personas/svg?seed=${agentName}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export default AGENT_AVATARS;
