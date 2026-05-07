// Shared game data across all Haven titles.

// img = filename without extension, used as images/common/class_overlays/{img}.png
const CO = { left: 41, top: 35, w: 81, h: 70, defaultRole: 'class-overlay', classOverlay: true };
export const CLASS_OVERLAY_ROWS = [
  { id: 1001, title: 'destruction (Demolitionist)',   img: 'demolitionist-destruction',  ...CO },
  { id: 1002, title: 'enhancement field (Tinkerer)',  img: 'tinkerer_enhancement field', ...CO },
  { id: 1003, title: 'favorite (Hatchet)',            img: 'hatchet_favorite',           ...CO },
  { id: 1004, title: 'gadjet (Tinkerer)',             img: 'tinkerer_gadjet',            ...CO },
  { id: 1005, title: 'gravity bomb (Tinkerer)',       img: 'tinkerer_gravity_bomb',      ...CO },
  { id: 1006, title: 'negative trap (Trapper)',       img: 'trapper-negative-trap',      ...CO },
  { id: 1007, title: 'pernicious fogger (Tinkerer)', img: 'tinkerer_pernicious_fogger', ...CO },
  { id: 1008, title: 'positive trap (Trapper)',       img: 'trapper-positive-trap',      ...CO },
  { id: 1009, title: 'rift (Cassandra)',              img: 'cassandra-rift',             ...CO },
  { id: 1010, title: 'sand devil (Red guard)',        img: 'red-guard-sand-devil',       ...CO },
  { id: 1011, title: 'shadow (Deathwalker)',          img: 'deathwalker-shadow',         ...CO },
  { id: 1012, title: 'tear (Nightshroud)',            img: 'nightshroud-tear',           ...CO },
  { id: 1013, title: 'teleportation pad (Tinkerer)', img: 'tinkerer_teleportation_pad', ...CO },
];

export const ELEMENTS = [
  { key: 'air',   label: 'Air',   color: '#29b89a' },
  { key: 'dark',  label: 'Dark',  color: '#8855cc' },
  { key: 'earth', label: 'Earth', color: '#5a9e45' },
  { key: 'fire',  label: 'Fire',  color: '#e06020' },
  { key: 'ice',   label: 'Ice',   color: '#3a9fdd' },
  { key: 'light', label: 'Light', color: '#c9a800' },
];

export const CONDITIONS = [
  { id:  1, title: 'Bane' },
  { id:  2, title: 'Brittle' },
  { id:  3, title: 'Deathwalker' },
  { id:  4, title: 'Disarm' },
  { id:  5, title: 'Doomstalker' },
  { id:  6, title: 'Geminate Melee' },
  { id:  7, title: 'Geminate Range' },
  { id:  8, title: 'Hatchet' },
  { id:  9, title: 'Immobilize' },
  { id: 10, title: 'Impair' },
  { id: 11, title: 'Invisible' },
  { id: 12, title: 'Muddle' },
  { id: 13, title: 'Poison' },
  { id: 14, title: 'Red Guard' },
  { id: 15, title: 'Regenerate' },
  { id: 16, title: 'Safeguard' },
  { id: 17, title: 'Strengthen' },
  { id: 18, title: 'Stun' },
  { id: 19, title: 'Ward' },
  { id: 20, title: 'Wound' },
  { id: 21, title: 'Doom' },
  { id: 22, title: 'Plague' },
];

export const MERCENARY_ROWS = [
  { id:  1, title: 'Anaphi', source: 'Mercenary Pack' },
  { id:  2, title: 'Infuser', source: 'Frosthaven' },
  { id:  3, title: 'Banner Spear', source: 'Frosthaven' },
  { id:  4, title: 'Berserker', source: 'Gloomhaven' },
  { id:  5, title: 'Bladeswarm', source: 'Gloomhaven' },
  { id:  6, title: 'Blinkblade', source: 'Frosthaven' },
  { id:  7, title: 'Boneshaper', source: 'Frosthaven' },
  { id:  8, title: 'Bruiser', source: 'Gloomhaven' },
  { id:  9, title: 'Cassandra', source: 'Mercenary Pack' },
  { id: 10, title: 'Crashing Tide', source: 'Frosthaven' },
  { id: 11, title: 'Cragheart', source: 'Gloomhaven' },
  { id: 12, title: 'Deathwalker', source: 'Frosthaven' },
  { id: 13, title: 'Demolitionist', source: 'Jaws of the Lion' },
  { id: 14, title: 'Doomstalker', source: 'Gloomhaven' },
  { id: 15, title: 'HIVE', source: 'Frosthaven' },
  { id: 16, title: 'Drifter', source: 'Frosthaven' },
  { id: 17, title: 'Elementalist', source: 'Gloomhaven' },
  { id: 18, title: 'Frozen Fist', source: 'Frosthaven' },
  { id: 19, title: 'Geminate', source: 'Frosthaven' },
  { id: 20, title: 'Hail', source: 'Mercenary Pack' },
  { id: 21, title: 'Hatchet', source: 'Jaws of the Lion' },
  { id: 22, title: 'Deepwraith', source: 'Frosthaven' },
  { id: 23, title: 'Pyroclast', source: 'Frosthaven' },
  { id: 24, title: 'Mindthief', source: 'Gloomhaven' },
  { id: 25, title: 'Nightshroud', source: 'Gloomhaven' },
  { id: 26, title: 'Plagueherald', source: 'Gloomhaven' },
  { id: 27, title: 'Metal Mosaic', source: 'Frosthaven' },
  { id: 28, title: 'Quartermaster', source: 'Gloomhaven' },
  { id: 29, title: 'Red Guard', source: 'Jaws of the Lion' },
  { id: 30, title: 'Satha', source: 'Mercenary Pack' },
  { id: 31, title: 'Sawbones', source: 'Gloomhaven' },
  { id: 32, title: 'Pain Conduit', source: 'Frosthaven' },
  { id: 33, title: 'Hollowpact', source: 'Frosthaven' },
  { id: 34, title: 'Silent Knife', source: 'Gloomhaven' },
  { id: 35, title: 'Snow Dancer', source: 'Frosthaven' },
  { id: 36, title: 'Soothsinger', source: 'Gloomhaven' },
  { id: 37, title: 'Spellweaver', source: 'Gloomhaven' },
  { id: 38, title: 'Soultether', source: 'Gloomhaven' },
  { id: 39, title: 'Sunkeeper', source: 'Frosthaven' },
  { id: 40, title: 'Tinkerer', source: 'Frosthaven' },
  { id: 41, title: 'Trapper', source: 'Frosthaven' },
  { id: 42, title: 'Voidwarden', source: 'Jaws of the Lion' },
  { id: 43, title: 'Wildfury', source: 'Gloomhaven' },
].map(r => ({ ...r, left: 40, top: 35 }));

export const MERCENARY_STATS = {
  // Gloomhaven
  4: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Berserker
  5: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Bladeswarm
  8: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Bruiser
  11: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Cragheart
  14: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Doomstalker
  17: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Elementalist
  24: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Mindthief
  25: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Nightshroud
  26: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Plagueherald
  28: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Quartermaster
  31: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Sawbones
  34: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Silent Knife
  36: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Soothsinger
  37: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Spellweaver
  38: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Soultether
  39: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Sunkeeper
  40: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Tinkerer
  43: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Wildfury
  // Mercenary Packs
  1: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Anaphi
  9: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Cassandra
  20: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Hail
  30: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Satha
  // Jaws of the Lion
  13: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Demolitionist
  21: { 1: { maxHp: 8 }, 2: { maxHp: 8 }, 3: { maxHp: 9 }, 4: { maxHp: 11 }, 5: { maxHp: 12 }, 6: { maxHp: 14 }, 7: { maxHp: 15 }, 8: { maxHp: 17 }, 9: { maxHp: 18 } }, // Hatchet
  29: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Red Guard
  42: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Voidwarden
  // Frosthaven
  3: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Banner Spear
  6: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Blinkblade
  7: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Boneshaper
  10: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Crashing Tide
  12: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Deathwalker
  16: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Drifter
  18: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Frozen Fist
  19: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Geminate
  22: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Deepwraith
  23: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Pyroclast
  27: { 1: { maxHp: 10 }, 2: { maxHp: 12 }, 3: { maxHp: 14 }, 4: { maxHp: 16 }, 5: { maxHp: 18 }, 6: { maxHp: 20 }, 7: { maxHp: 22 }, 8: { maxHp: 24 }, 9: { maxHp: 26 } }, // Metal Mosaic
  32: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Pain Conduit
  35: { 1: { maxHp: 8 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // Snow Dancer
  41: { 1: { maxHp: 6 }, 2: { maxHp: 7 }, 3: { maxHp: 8 }, 4: { maxHp: 9 }, 5: { maxHp: 10 }, 6: { maxHp: 11 }, 7: { maxHp: 12 }, 8: { maxHp: 13 }, 9: { maxHp: 14 } }, // Trapper
  15: { 1: { maxHp: 7 }, 2: { maxHp: 9 }, 3: { maxHp: 11 }, 4: { maxHp: 12 }, 5: { maxHp: 14 }, 6: { maxHp: 15 }, 7: { maxHp: 17 }, 8: { maxHp: 18 }, 9: { maxHp: 20 } }, // H.I.V.E.
};

export const SUMMON_ROWS = [
  { id:   1, title: 'Angry Wasps', mercenary: 'Bladeswarm' },
  { id:   2, title: 'Animated Claymore', mercenary: 'Infuser' },
  { id:   3, title: 'Arcing Generator', mercenary: 'H.I.V.E.' },
  { id:   4, title: 'Armored Tank', mercenary: 'H.I.V.E.' },
  { id:   5, title: 'Banner of Courage', mercenary: 'Banner Spear' },
  { id:   6, title: 'Banner of Doom', mercenary: 'Banner Spear' },
  { id:   7, title: 'Banner of Hope', mercenary: 'Banner Spear' },
  { id:   8, title: 'Banner of Strength', mercenary: 'Banner Spear' },
  { id:   9, title: 'Banner of Valor', mercenary: 'Banner Spear' },
  { id:  10, title: 'Bat Swarm' },
  { id:  11, title: 'Battle Boar', mercenary: 'Doomstalker' },
  { id:  12, title: 'Battle Bot', mercenary: 'Tinkerer' },
  { id:  13, title: 'Bear' },
  { id:  14, title: 'Black Unicorn' },
  { id:  15, title: 'Bloat Maggots', mercenary: 'Bladeswarm' },
  { id:  16, title: 'Bombardier', mercenary: 'H.I.V.E.' },
  { id:  17, title: 'Bone Horde', mercenary: 'Boneshaper' },
  { id:  18, title: 'Burning Avatar' },
  { id:  19, title: 'Chromatic Construct', mercenary: 'Elementalist' },
  { id:  20, title: 'Covetous Imp', mercenary: 'Soultether' },
  { id:  21, title: 'Creeping Beetles', mercenary: 'Bladeswarm' },
  { id:  22, title: 'Dampening Unit', mercenary: 'H.I.V.E.' },
  { id:  23, title: 'Decoy', mercenary: 'Tinkerer' },
  { id:  24, title: 'Defense Grid', mercenary: 'Trapper' },
  { id:  25, title: 'Doppelganger' },
  { id:  26, title: 'Duskrat Swarm', mercenary: 'Anaphi' },
  { id:  27, title: 'Elemental Conduit', mercenary: 'Elementalist' },
  { id:  28, title: 'Ember Sprite', mercenary: 'Soultether' },
  { id:  29, title: 'Fey Subjugator', mercenary: 'Soultether' },
  { id:  30, title: 'Flesh Bomb', mercenary: 'Pain Conduit' },
  { id:  31, title: 'Flesh Fiend', mercenary: 'Pain Conduit' },
  { id:  32, title: 'Floating Jellyfish', mercenary: 'Soultether' },
  { id:  33, title: 'Ghost Falcon', mercenary: 'Cassandra' },
  { id:  34, title: 'Giant Rat' },
  { id:  35, title: 'Giant Toad' },
  { id:  36, title: 'Giant Tortoise' },
  { id:  37, title: 'Great Achinotl', mercenary: 'Doomstalker' },
  { id:  38, title: 'Green Adder' },
  { id:  39, title: 'Green Snake', mercenary: 'Doomstalker' },
  { id:  40, title: 'Healing Sprite' },
  { id:  41, title: 'Horned Hristek', mercenary: 'Doomstalker' },
  { id:  42, title: 'Iron Beast', mercenary: 'Soultether' },
  { id:  43, title: 'Jackal Mech', mercenary: 'H.I.V.E.' },
  { id:  44, title: 'Jade Falcon' },
  { id:  45, title: 'Kill Bot', mercenary: 'Tinkerer' },
  { id:  46, title: 'Lava Golem' },
  { id:  47, title: 'Leaper', mercenary: 'H.I.V.E.' },
  { id:  48, title: 'Lightning Moth', mercenary: 'Bladeswarm' },
  { id:  49, title: 'Living Bomb' },
  { id:  50, title: 'Longbowman', mercenary: 'Banner Spear' },
  { id:  51, title: 'Machine Bolter', mercenary: 'H.I.V.E.' },
  { id:  52, title: 'Mana Sphere' },
  { id:  53, title: 'Mech Suit' },
  { id:  54, title: 'Monolith', mercenary: 'Wildfury' },
  { id:  55, title: 'Monstrous Rat' },
  { id:  56, title: 'Mystic Ally' },
  { id:  57, title: 'Nail Spheres' },
  { id:  58, title: 'Polar Cat', mercenary: 'Snowdancer' },
  { id:  59, title: 'Prismatic Unicorn', mercenary: 'Soultether' },
  { id:  60, title: 'Rage Hornets', mercenary: 'Bladeswarm' },
  { id:  61, title: 'Raging Corpse', mercenary: 'Boneshaper' },
  { id:  62, title: 'Rat King', mercenary: 'Mindthief' },
  { id:  63, title: 'Rat Monstrosity', mercenary: 'Mindthief' },
  { id:  64, title: 'Rat Queen', mercenary: 'Anaphi' },
  { id:  65, title: 'Rat Swarm', mercenary: 'Mindthief' },
  { id:  66, title: 'Red Falcon' },
  { id:  67, title: 'Reinforcement', mercenary: 'Banner Spear' },
  { id:  68, title: 'Repair Drone', mercenary: 'H.I.V.E.' },
  { id:  69, title: 'Rift Spirit', mercenary: 'Soultether' },
  { id:  70, title: 'Rock Colossus', mercenary: 'Soultether' },
  { id:  71, title: 'Rosie', mercenary: 'Anaphi' },
  { id:  72, title: 'Rust Vermin', mercenary: 'Bladeswarm' },
  { id:  73, title: 'Sewer Monstrosity', mercenary: 'Anaphi' },
  { id:  74, title: 'Shadow Beast', mercenary: 'Deathwalker' },
  { id:  75, title: 'Shadow Horror', mercenary: 'Deathwalker' },
  { id:  76, title: 'Shadow Wolf', mercenary: 'Soultether' },
  { id:  77, title: 'Shaggy Lure', mercenary: 'Trapper' },
  { id:  78, title: 'Shambling Skeleton', mercenary: 'Boneshaper' },
  { id:  79, title: 'Shield Spider', mercenary: 'H.I.V.E.' },
  { id:  80, title: 'Skeleton' },
  { id:  81, title: 'Skeleton Sorcerer', mercenary: 'Boneshaper' },
  { id:  82, title: 'Sledge Driver', mercenary: 'H.I.V.E.' },
  { id:  83, title: 'Slime Spirit', mercenary: 'Soultether' },
  { id:  84, title: 'Sniper Turret', mercenary: 'H.I.V.E.' },
  { id:  85, title: 'Snow Fox', mercenary: 'Snowdancer' },
  { id:  86, title: 'Soul Leeches', mercenary: 'Bladeswarm' },
  { id:  87, title: 'Spirit Banner' },
  { id:  88, title: 'Spiritbound Falchion', mercenary: 'Infuser' },
  { id:  89, title: 'Spitting Cobra' },
  { id:  90, title: 'Spotted Hound' },
  { id:  91, title: 'Staunch Garralev', mercenary: 'Doomstalker' },
  { id:  92, title: 'Steel Construct' },
  { id:  93, title: 'Steel Scarabs', mercenary: 'Bladeswarm' },
  { id:  94, title: 'Stitched Atrocity', mercenary: 'Boneshaper' },
  { id:  95, title: 'Swamp Alligator' },
  { id:  96, title: 'Sword Propeller', mercenary: 'H.I.V.E.' },
  { id:  97, title: 'Tattered Wolf' },
  { id:  98, title: 'Thorn Shooter', mercenary: 'Soultether' },
  { id:  99, title: 'Torch Bearer', mercenary: 'Banner Spear' },
  { id: 100, title: 'Toxin Distributor', mercenary: 'H.I.V.E.' },
  { id: 101, title: 'Trained Falcon', mercenary: 'Banner Spear' },
  { id: 102, title: 'Trapping Unit', mercenary: 'H.I.V.E.' },
  { id: 103, title: 'Twilight Archon', mercenary: 'Cassandra' },
  { id: 104, title: 'Vicious Jackal', mercenary: 'Doomstalker' },
  { id: 105, title: 'Vital Force', mercenary: 'Wildfury' },
  { id: 106, title: 'Void Eater', mercenary: 'Soultether' },
  { id: 107, title: 'War Hawk' },
  { id: 108, title: 'War Raptor', mercenary: 'Doomstalker' },
  { id: 109, title: 'Warrior Spirit' },
  { id: 110, title: 'White Owl', mercenary: 'Snowdancer' },
  { id: 111, title: 'Wind Idol', mercenary: 'Wildfury' },
  { id: 112, title: 'Wind Totem' },
  { id: 113, title: 'Wraith', mercenary: 'Boneshaper' },
  { id: 114, title: 'Zephyr' },
  { id: 115, title: 'Harrowers Grasp', mercenary: 'Anaphi' },

].map(r => ({ ...r, left: 40, top: 35 }));
