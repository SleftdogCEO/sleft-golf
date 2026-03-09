/**
 * seed-courses.mjs
 *
 * Seeds the Supabase `courses` table with 200+ Florida golf courses.
 * Focuses heavily on South Florida (Palm Beach, Broward, Miami-Dade)
 * but also covers the rest of the state.
 *
 * Usage:  node scripts/seed-courses.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envFile = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helper ─────────────────────────────────────────────────────────
function c(name, opts = {}) {
  return {
    name,
    parent_club: opts.club || null,
    address: opts.address || null,
    city: opts.city,
    state: "FL",
    zip: opts.zip || null,
    lat: opts.lat,
    lng: opts.lng,
    holes: opts.holes || 18,
    par: opts.par || 72,
    slope_rating: opts.slope || null,
    course_rating: opts.rating || null,
    website: opts.web || null,
    phone: opts.phone || null,
    image_url: opts.img || null,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  COURSE DATA — 200+ Florida courses
// ═══════════════════════════════════════════════════════════════════

const courses = [

  // ────────────────────────────────────────────────────────────────
  //  PALM BEACH COUNTY  (heavy focus)
  // ────────────────────────────────────────────────────────────────

  // PGA National Resort
  c("PGA National - Champion Course", { club: "PGA National Resort", city: "Palm Beach Gardens", zip: "33418", lat: 26.8326, lng: -80.1340, par: 72, slope: 141, rating: 74.7, web: "https://www.pgaresort.com", phone: "561-627-2000" }),
  c("PGA National - Fazio Course", { club: "PGA National Resort", city: "Palm Beach Gardens", zip: "33418", lat: 26.8350, lng: -80.1380, par: 72, slope: 131, rating: 72.1, web: "https://www.pgaresort.com" }),
  c("PGA National - Squire Course", { club: "PGA National Resort", city: "Palm Beach Gardens", zip: "33418", lat: 26.8310, lng: -80.1320, par: 72, slope: 129, rating: 71.5, web: "https://www.pgaresort.com" }),
  c("PGA National - Palmer Course", { club: "PGA National Resort", city: "Palm Beach Gardens", zip: "33418", lat: 26.8290, lng: -80.1360, par: 72, slope: 128, rating: 71.0, web: "https://www.pgaresort.com" }),
  c("PGA National - Estates Course", { club: "PGA National Resort", city: "Palm Beach Gardens", zip: "33418", lat: 26.8370, lng: -80.1400, par: 72, slope: 125, rating: 70.2, web: "https://www.pgaresort.com" }),

  // Ibis Golf & Country Club
  c("Ibis - Tradition Course", { club: "Ibis Golf & Country Club", city: "West Palm Beach", zip: "33412", lat: 26.8530, lng: -80.1720, par: 72, slope: 135, rating: 73.0, web: "https://www.ibisfl.com", phone: "561-625-6000" }),
  c("Ibis - Heritage Course", { club: "Ibis Golf & Country Club", city: "West Palm Beach", zip: "33412", lat: 26.8510, lng: -80.1700, par: 72, slope: 130, rating: 71.8, web: "https://www.ibisfl.com" }),
  c("Ibis - Legend Course", { club: "Ibis Golf & Country Club", city: "West Palm Beach", zip: "33412", lat: 26.8550, lng: -80.1740, par: 72, slope: 133, rating: 72.5, web: "https://www.ibisfl.com" }),

  // BallenIsles Country Club
  c("BallenIsles - North Course", { club: "BallenIsles Country Club", city: "Palm Beach Gardens", zip: "33418", lat: 26.8380, lng: -80.1150, par: 72, slope: 137, rating: 73.5, web: "https://www.ballenisles.org" }),
  c("BallenIsles - South Course", { club: "BallenIsles Country Club", city: "Palm Beach Gardens", zip: "33418", lat: 26.8360, lng: -80.1170, par: 72, slope: 132, rating: 72.0, web: "https://www.ballenisles.org" }),
  c("BallenIsles - East Course", { club: "BallenIsles Country Club", city: "Palm Beach Gardens", zip: "33418", lat: 26.8400, lng: -80.1130, par: 72, slope: 126, rating: 70.5, web: "https://www.ballenisles.org" }),

  // Jupiter Hills Club
  c("Jupiter Hills - Hills Course", { club: "Jupiter Hills Club", city: "Tequesta", zip: "33469", lat: 26.9580, lng: -80.0830, par: 72, slope: 143, rating: 74.5, web: "https://www.jupiterhillsclub.com" }),
  c("Jupiter Hills - Village Course", { club: "Jupiter Hills Club", city: "Tequesta", zip: "33469", lat: 26.9560, lng: -80.0810, par: 70, slope: 128, rating: 69.5 }),

  // Jonathan's Landing
  c("Jonathan's Landing - Fazio Course", { club: "Jonathan's Landing Golf Club", city: "Jupiter", zip: "33477", lat: 26.9220, lng: -80.1150, par: 72, slope: 138, rating: 73.8 }),
  c("Jonathan's Landing - Hills Course", { club: "Jonathan's Landing Golf Club", city: "Jupiter", zip: "33477", lat: 26.9200, lng: -80.1130, par: 72, slope: 131, rating: 71.5 }),
  c("Jonathan's Landing - Village Course", { club: "Jonathan's Landing Golf Club", city: "Jupiter", zip: "33477", lat: 26.9240, lng: -80.1170, par: 64, holes: 18, slope: 108, rating: 62.0 }),

  // Frenchman's Creek
  c("Frenchman's Creek - North Course", { club: "Frenchman's Creek Beach & Country Club", city: "Palm Beach Gardens", zip: "33410", lat: 26.8680, lng: -80.0970, par: 72, slope: 136, rating: 73.2 }),
  c("Frenchman's Creek - South Course", { club: "Frenchman's Creek Beach & Country Club", city: "Palm Beach Gardens", zip: "33410", lat: 26.8660, lng: -80.0950, par: 72, slope: 133, rating: 72.5 }),

  // Mirasol
  c("Mirasol - Sunrise Course", { club: "Mirasol Country Club", city: "Palm Beach Gardens", zip: "33418", lat: 26.8480, lng: -80.1550, par: 72, slope: 139, rating: 74.1, web: "https://www.mirasolcc.com" }),
  c("Mirasol - Sunset Course", { club: "Mirasol Country Club", city: "Palm Beach Gardens", zip: "33418", lat: 26.8460, lng: -80.1530, par: 72, slope: 135, rating: 73.0 }),

  // Breakers
  c("The Breakers - Rees Jones Course", { club: "The Breakers Palm Beach", city: "West Palm Beach", zip: "33411", lat: 26.7100, lng: -80.1200, par: 72, slope: 132, rating: 72.8, web: "https://www.thebreakers.com", phone: "561-653-6320" }),
  c("The Breakers - Ocean Course", { club: "The Breakers Palm Beach", city: "Palm Beach", zip: "33480", lat: 26.7150, lng: -80.0350, par: 70, slope: 117, rating: 67.5, web: "https://www.thebreakers.com" }),

  // Broken Sound
  c("Broken Sound - Old Course", { club: "Broken Sound Club", city: "Boca Raton", zip: "33496", lat: 26.3930, lng: -80.1530, par: 72, slope: 134, rating: 72.5, web: "https://www.brokensoundclub.org" }),
  c("Broken Sound - New Course", { club: "Broken Sound Club", city: "Boca Raton", zip: "33496", lat: 26.3950, lng: -80.1550, par: 72, slope: 131, rating: 71.8 }),

  // Standalone PBC courses
  c("Old Palm Golf Club", { city: "Palm Beach Gardens", zip: "33418", lat: 26.8410, lng: -80.1420, par: 72, slope: 142, rating: 74.8, web: "https://www.oldpalmgolfclub.com" }),
  c("Trump International Golf Club", { city: "West Palm Beach", zip: "33412", lat: 26.8440, lng: -80.1630, par: 72, slope: 140, rating: 74.0, web: "https://www.trumpinternationalgolfclub.com" }),
  c("Banyan Cay Resort & Golf", { city: "West Palm Beach", zip: "33401", lat: 26.7280, lng: -80.0830, par: 72, slope: 130, rating: 71.5, web: "https://www.banyancay.com" }),
  c("The Bear's Club", { city: "Jupiter", zip: "33477", lat: 26.9120, lng: -80.1350, par: 72, slope: 144, rating: 75.1 }),
  c("Palm Beach Par 3 Golf Course", { city: "Palm Beach", zip: "33480", lat: 26.7030, lng: -80.0340, par: 27, holes: 9, slope: null, rating: null, web: "https://www.palmbeachpar3.com", phone: "561-547-0598" }),
  c("Wellington National Golf Club", { city: "Wellington", zip: "33414", lat: 26.6510, lng: -80.2520, par: 72, slope: 137, rating: 73.5, web: "https://www.wellingtonnational.com" }),
  c("Okeeheelee Golf Course", { city: "West Palm Beach", zip: "33411", lat: 26.6630, lng: -80.1720, par: 72, slope: 127, rating: 71.2, web: "https://www.okeeheelee.com", phone: "561-964-4653" }),
  c("Links at Madison Green", { city: "Royal Palm Beach", zip: "33411", lat: 26.6870, lng: -80.2280, par: 72, slope: 128, rating: 71.5 }),
  c("Sandhill Crane Golf Club", { city: "Palm Beach Gardens", zip: "33412", lat: 26.8150, lng: -80.1590, par: 72, slope: 126, rating: 70.8, web: "https://www.sandhillcranegolf.com" }),
  c("Village Golf Club", { city: "Royal Palm Beach", zip: "33411", lat: 26.7050, lng: -80.2310, par: 72, slope: 125, rating: 70.5 }),
  c("Abacoa Golf Club", { city: "Jupiter", zip: "33458", lat: 26.9280, lng: -80.0950, par: 72, slope: 133, rating: 72.5, web: "https://www.abacoagolfclub.com", phone: "561-622-0036" }),
  c("Seminole Golf Club", { city: "Juno Beach", zip: "33408", lat: 26.8870, lng: -80.0530, par: 72, slope: 143, rating: 75.0 }),
  c("Lost City Golf Club", { city: "Atlantis", zip: "33462", lat: 26.5960, lng: -80.1010, par: 72, slope: 125, rating: 70.2 }),
  c("Everglades Club", { city: "Palm Beach", zip: "33480", lat: 26.7100, lng: -80.0420, par: 72, slope: 130, rating: 71.5 }),
  c("Park Ridge Golf Course", { city: "Lantana", zip: "33462", lat: 26.5820, lng: -80.0730, par: 57, holes: 18, slope: null, rating: null }),
  c("Westchester Golf & Country Club", { city: "Boynton Beach", zip: "33436", lat: 26.5380, lng: -80.1240, par: 72, slope: 124, rating: 70.0 }),
  c("Boca Raton Resort - Resort Course", { club: "Boca Raton Resort & Club", city: "Boca Raton", zip: "33432", lat: 26.3490, lng: -80.0860, par: 71, slope: 129, rating: 71.0, web: "https://www.bocaresort.com" }),
  c("Boca West - Course 1", { club: "Boca West Country Club", city: "Boca Raton", zip: "33434", lat: 26.3770, lng: -80.1520, par: 72, slope: 130, rating: 71.5 }),
  c("Boca West - Course 2", { club: "Boca West Country Club", city: "Boca Raton", zip: "33434", lat: 26.3750, lng: -80.1500, par: 72, slope: 127, rating: 70.8 }),
  c("Boca West - Course 3", { club: "Boca West Country Club", city: "Boca Raton", zip: "33434", lat: 26.3730, lng: -80.1480, par: 72, slope: 125, rating: 70.2 }),
  c("Boca West - Course 4", { club: "Boca West Country Club", city: "Boca Raton", zip: "33434", lat: 26.3790, lng: -80.1540, par: 72, slope: 123, rating: 69.8 }),
  c("Boca Dunes Golf & Country Club", { city: "Boca Raton", zip: "33428", lat: 26.3530, lng: -80.1850, par: 62, holes: 18, slope: 105, rating: 60.0 }),
  c("Osprey Point Golf Course", { city: "Boca Raton", zip: "33498", lat: 26.4060, lng: -80.1810, par: 72, slope: 128, rating: 71.0 }),
  c("Boca Greens Country Club", { city: "Boca Raton", zip: "33498", lat: 26.4110, lng: -80.1700, par: 72, slope: 126, rating: 70.5 }),
  c("Delray Beach Golf Club", { city: "Delray Beach", zip: "33444", lat: 26.4560, lng: -80.0830, par: 72, slope: 121, rating: 69.5, web: "https://www.delraybeachgolfclub.com" }),
  c("Lakeview Golf Club", { city: "Delray Beach", zip: "33445", lat: 26.4630, lng: -80.1150, par: 72, slope: 119, rating: 68.8 }),
  c("Atlantis Country Club", { city: "Atlantis", zip: "33462", lat: 26.5940, lng: -80.1050, par: 72, slope: 127, rating: 70.8 }),
  c("Winston Trails Golf Club", { city: "Lake Worth", zip: "33467", lat: 26.5720, lng: -80.1480, par: 72, slope: 130, rating: 71.5 }),
  c("Indian Spring Country Club", { city: "Boynton Beach", zip: "33437", lat: 26.5310, lng: -80.1320, par: 72, slope: 123, rating: 69.8 }),
  c("Hunters Run Golf Club - North", { club: "Hunters Run Country Club", city: "Boynton Beach", zip: "33437", lat: 26.5260, lng: -80.1290, par: 72, slope: 126, rating: 70.5 }),
  c("Hunters Run Golf Club - South", { club: "Hunters Run Country Club", city: "Boynton Beach", zip: "33437", lat: 26.5240, lng: -80.1270, par: 72, slope: 124, rating: 70.0 }),
  c("Hunters Run Golf Club - East", { club: "Hunters Run Country Club", city: "Boynton Beach", zip: "33437", lat: 26.5280, lng: -80.1310, par: 72, slope: 122, rating: 69.5 }),
  c("Polo Trace Golf Club", { city: "Delray Beach", zip: "33446", lat: 26.4430, lng: -80.1780, par: 72, slope: 131, rating: 72.0 }),
  c("Gleneagles Country Club - Red", { club: "Gleneagles Country Club", city: "Delray Beach", zip: "33445", lat: 26.4530, lng: -80.1250, par: 72, slope: 124, rating: 70.0 }),
  c("Gleneagles Country Club - Blue", { club: "Gleneagles Country Club", city: "Delray Beach", zip: "33445", lat: 26.4510, lng: -80.1230, par: 72, slope: 122, rating: 69.5 }),
  c("Palm Beach Country Club", { city: "Palm Beach", zip: "33480", lat: 26.7180, lng: -80.0380, par: 72, slope: 128, rating: 71.0 }),
  c("North Palm Beach Country Club", { city: "North Palm Beach", zip: "33408", lat: 26.8220, lng: -80.0580, par: 72, slope: 126, rating: 70.5 }),
  c("Lake Worth Beach Golf Club", { city: "Lake Worth Beach", zip: "33460", lat: 26.6120, lng: -80.0610, par: 70, slope: 118, rating: 67.5 }),
  c("Cypress Creek Country Club", { city: "Boynton Beach", zip: "33437", lat: 26.5350, lng: -80.1360, par: 72, slope: 125, rating: 70.2 }),
  c("Mayacoo Lakes Country Club", { city: "West Palm Beach", zip: "33411", lat: 26.6770, lng: -80.1560, par: 72, slope: 130, rating: 71.5 }),
  c("The Falls Club of the Palm Beaches", { city: "Lake Worth", zip: "33467", lat: 26.5850, lng: -80.1750, par: 72, slope: 132, rating: 72.0 }),
  c("Ironhorse Country Club", { city: "West Palm Beach", zip: "33412", lat: 26.8130, lng: -80.1480, par: 72, slope: 131, rating: 71.8 }),
  c("Emerald Dunes Golf Club", { city: "West Palm Beach", zip: "33411", lat: 26.6980, lng: -80.1450, par: 72, slope: 128, rating: 71.2 }),

  // ────────────────────────────────────────────────────────────────
  //  BROWARD COUNTY
  // ────────────────────────────────────────────────────────────────

  c("TPC Eagle Trace", { city: "Coral Springs", zip: "33071", lat: 26.2710, lng: -80.2350, par: 72, slope: 135, rating: 73.0, web: "https://www.tpceagletrace.com" }),

  // Jacaranda
  c("Jacaranda Golf Club - East Course", { club: "Jacaranda Golf Club", city: "Plantation", zip: "33324", lat: 26.1180, lng: -80.2670, par: 72, slope: 131, rating: 72.0, web: "https://www.jacarandagolf.com", phone: "954-472-5836" }),
  c("Jacaranda Golf Club - West Course", { club: "Jacaranda Golf Club", city: "Plantation", zip: "33324", lat: 26.1160, lng: -80.2690, par: 72, slope: 128, rating: 71.2 }),

  // Inverrary
  c("Inverrary Country Club - East Course", { club: "Inverrary Country Club", city: "Lauderhill", zip: "33319", lat: 26.1530, lng: -80.2320, par: 72, slope: 126, rating: 70.5 }),
  c("Inverrary Country Club - West Course", { club: "Inverrary Country Club", city: "Lauderhill", zip: "33319", lat: 26.1510, lng: -80.2340, par: 72, slope: 124, rating: 69.8 }),

  // Colony West
  c("Colony West Golf Club - Championship", { club: "Colony West Golf Club", city: "Tamarac", zip: "33321", lat: 26.2060, lng: -80.2580, par: 72, slope: 130, rating: 71.5, web: "https://www.colonywestgolf.com" }),
  c("Colony West Golf Club - Glades Course", { club: "Colony West Golf Club", city: "Tamarac", zip: "33321", lat: 26.2040, lng: -80.2560, par: 72, slope: 120, rating: 68.5 }),

  // Weston Hills
  c("Weston Hills - Tour Course", { club: "Weston Hills Country Club", city: "Weston", zip: "33326", lat: 26.1020, lng: -80.3730, par: 72, slope: 138, rating: 73.8, web: "https://www.westonhillscc.com" }),
  c("Weston Hills - Player Course", { club: "Weston Hills Country Club", city: "Weston", zip: "33326", lat: 26.1000, lng: -80.3710, par: 72, slope: 133, rating: 72.0 }),

  // Palm Aire
  c("Palm Aire Country Club - Oaks Course", { club: "Palm Aire Country Club", city: "Pompano Beach", zip: "33069", lat: 26.2510, lng: -80.1630, par: 72, slope: 127, rating: 70.8 }),
  c("Palm Aire Country Club - Palms Course", { club: "Palm Aire Country Club", city: "Pompano Beach", zip: "33069", lat: 26.2490, lng: -80.1610, par: 72, slope: 124, rating: 70.0 }),
  c("Palm Aire Country Club - Pines Course", { club: "Palm Aire Country Club", city: "Pompano Beach", zip: "33069", lat: 26.2530, lng: -80.1650, par: 72, slope: 122, rating: 69.5 }),

  // Bonaventure
  c("Bonaventure Country Club - East Course", { club: "Bonaventure Country Club", city: "Weston", zip: "33326", lat: 26.1120, lng: -80.3430, par: 72, slope: 126, rating: 70.5 }),
  c("Bonaventure Country Club - West Course", { club: "Bonaventure Country Club", city: "Weston", zip: "33326", lat: 26.1100, lng: -80.3450, par: 72, slope: 123, rating: 69.8 }),

  // Standalone Broward
  c("Woodlands Country Club", { city: "Tamarac", zip: "33321", lat: 26.2120, lng: -80.2510, par: 72, slope: 125, rating: 70.2 }),
  c("Deer Creek Golf Club", { city: "Deerfield Beach", zip: "33442", lat: 26.3230, lng: -80.1340, par: 72, slope: 128, rating: 71.0 }),
  c("Heron Bay Golf Course", { city: "Coral Springs", zip: "33076", lat: 26.3110, lng: -80.2280, par: 72, slope: 130, rating: 71.5, web: "https://www.heronbaygolf.com" }),
  c("Grande Oaks Golf Club", { city: "Fort Lauderdale", zip: "33330", lat: 26.0720, lng: -80.3150, par: 72, slope: 134, rating: 72.5 }),
  c("Diplomat Golf & Tennis Club", { city: "Hallandale Beach", zip: "33009", lat: 25.9720, lng: -80.1550, par: 72, slope: 127, rating: 70.8, web: "https://www.diplomatresort.com" }),
  c("Lago Mar Country Club", { city: "Plantation", zip: "33324", lat: 26.1250, lng: -80.2810, par: 72, slope: 124, rating: 70.0 }),
  c("Pembroke Lakes Golf Club", { city: "Pembroke Pines", zip: "33024", lat: 26.0140, lng: -80.2620, par: 72, slope: 121, rating: 69.2 }),
  c("Davie Golf & Country Club", { city: "Davie", zip: "33328", lat: 26.0650, lng: -80.2830, par: 72, slope: 118, rating: 68.5 }),
  c("Rolling Hills Golf Resort", { city: "Fort Lauderdale", zip: "33328", lat: 26.0680, lng: -80.2710, par: 72, slope: 129, rating: 71.2 }),
  c("Fort Lauderdale Country Club", { city: "Fort Lauderdale", zip: "33308", lat: 26.1740, lng: -80.1200, par: 72, slope: 126, rating: 70.5 }),
  c("Orangebrook Golf & Country Club - East", { club: "Orangebrook Golf & Country Club", city: "Hollywood", zip: "33021", lat: 26.0230, lng: -80.1820, par: 72, slope: 124, rating: 70.0 }),
  c("Orangebrook Golf & Country Club - West", { club: "Orangebrook Golf & Country Club", city: "Hollywood", zip: "33021", lat: 26.0210, lng: -80.1840, par: 72, slope: 121, rating: 69.2 }),

  // ────────────────────────────────────────────────────────────────
  //  MIAMI-DADE COUNTY
  // ────────────────────────────────────────────────────────────────

  // Trump National Doral
  c("Trump National Doral - Blue Monster", { club: "Trump National Doral", city: "Doral", zip: "33178", lat: 25.8140, lng: -80.3390, par: 72, slope: 143, rating: 75.2, web: "https://www.trumpgolfdoral.com", phone: "305-592-2000" }),
  c("Trump National Doral - Red Tiger", { club: "Trump National Doral", city: "Doral", zip: "33178", lat: 25.8160, lng: -80.3410, par: 72, slope: 134, rating: 72.5 }),
  c("Trump National Doral - Gold Course", { club: "Trump National Doral", city: "Doral", zip: "33178", lat: 25.8120, lng: -80.3370, par: 72, slope: 130, rating: 71.8 }),
  c("Trump National Doral - Silver Course", { club: "Trump National Doral", city: "Doral", zip: "33178", lat: 25.8100, lng: -80.3350, par: 71, slope: 127, rating: 70.5 }),

  // Turnberry Isle
  c("Turnberry Isle - Soffer Course", { club: "Turnberry Isle Miami", city: "Aventura", zip: "33180", lat: 25.9630, lng: -80.1420, par: 72, slope: 136, rating: 73.5, web: "https://www.turnberryislemiami.com" }),
  c("Turnberry Isle - Miller Course", { club: "Turnberry Isle Miami", city: "Aventura", zip: "33180", lat: 25.9610, lng: -80.1400, par: 72, slope: 131, rating: 72.0 }),

  // Country Club of Miami
  c("Country Club of Miami - East Course", { club: "Country Club of Miami", city: "Hialeah", zip: "33015", lat: 25.8880, lng: -80.3080, par: 72, slope: 127, rating: 70.8 }),
  c("Country Club of Miami - West Course", { club: "Country Club of Miami", city: "Hialeah", zip: "33015", lat: 25.8860, lng: -80.3100, par: 70, slope: 122, rating: 69.0 }),

  // Standalone Miami-Dade
  c("Biltmore Golf Course", { city: "Coral Gables", zip: "33134", lat: 25.7270, lng: -80.2780, par: 71, slope: 130, rating: 71.5, web: "https://www.biltmorehotel.com/golf", phone: "305-460-5364" }),
  c("Crandon Golf at Key Biscayne", { city: "Key Biscayne", zip: "33149", lat: 25.6880, lng: -80.1620, par: 72, slope: 132, rating: 72.0, web: "https://www.crandongolf.com", phone: "305-361-9129" }),
  c("Miami Beach Golf Club", { city: "Miami Beach", zip: "33140", lat: 25.8130, lng: -80.1360, par: 72, slope: 128, rating: 71.0, web: "https://www.miamibeachgolfclub.com" }),
  c("Melreese Golf Course", { city: "Miami", zip: "33126", lat: 25.7870, lng: -80.2710, par: 71, slope: 124, rating: 70.0 }),
  c("Normandy Shores Golf Club", { city: "Miami Beach", zip: "33141", lat: 25.8320, lng: -80.1380, par: 71, slope: 122, rating: 69.5, web: "https://www.normandyshoresgolf.com" }),
  c("Shula's Golf Club", { city: "Miami Lakes", zip: "33014", lat: 25.9120, lng: -80.3130, par: 72, slope: 126, rating: 70.5 }),
  c("Palmetto Golf Course", { city: "Miami", zip: "33157", lat: 25.6310, lng: -80.3280, par: 70, slope: 119, rating: 68.0 }),
  c("Calusa Country Club", { city: "Miami", zip: "33186", lat: 25.6580, lng: -80.4030, par: 72, slope: 125, rating: 70.2 }),
  c("Miccosukee Golf & Country Club", { city: "Miami", zip: "33174", lat: 25.7620, lng: -80.4120, par: 72, slope: 123, rating: 69.8 }),
  c("Riviera Country Club", { city: "Coral Gables", zip: "33146", lat: 25.7150, lng: -80.2680, par: 72, slope: 127, rating: 70.8 }),
  c("Doral Park Golf & Country Club", { city: "Doral", zip: "33178", lat: 25.8050, lng: -80.3480, par: 72, slope: 124, rating: 70.0 }),
  c("Killian Greens Golf Club", { city: "Miami", zip: "33186", lat: 25.6420, lng: -80.3920, par: 70, slope: 120, rating: 68.5 }),
  c("Keys Gate Golf Club", { city: "Homestead", zip: "33035", lat: 25.4820, lng: -80.4250, par: 72, slope: 126, rating: 70.5 }),
  c("Redland Golf & Country Club", { city: "Homestead", zip: "33030", lat: 25.5120, lng: -80.4510, par: 72, slope: 122, rating: 69.2 }),
  c("Kendall Golf Course", { city: "Miami", zip: "33176", lat: 25.6780, lng: -80.3650, par: 72, slope: 118, rating: 68.0 }),

  // ────────────────────────────────────────────────────────────────
  //  MARTIN / ST. LUCIE COUNTY
  // ────────────────────────────────────────────────────────────────

  c("Sailfish Sands Golf Course", { city: "Stuart", zip: "34997", lat: 27.1650, lng: -80.2210, par: 72, slope: 125, rating: 70.2 }),
  c("PGA Golf Club - Wanamaker Course", { club: "PGA Golf Club", city: "Port St. Lucie", zip: "34986", lat: 27.2930, lng: -80.3950, par: 72, slope: 135, rating: 73.5, web: "https://www.pgagolfclub.com" }),
  c("PGA Golf Club - Ryder Course", { club: "PGA Golf Club", city: "Port St. Lucie", zip: "34986", lat: 27.2910, lng: -80.3930, par: 72, slope: 137, rating: 73.8 }),
  c("PGA Golf Club - Dye Course", { club: "PGA Golf Club", city: "Port St. Lucie", zip: "34986", lat: 27.2950, lng: -80.3970, par: 72, slope: 140, rating: 74.5 }),
  c("Sandridge Golf Club - Dunes Course", { club: "Sandridge Golf Club", city: "Vero Beach", zip: "32967", lat: 27.6510, lng: -80.4180, par: 72, slope: 128, rating: 71.0 }),
  c("Sandridge Golf Club - Lakes Course", { club: "Sandridge Golf Club", city: "Vero Beach", zip: "32967", lat: 27.6530, lng: -80.4200, par: 72, slope: 125, rating: 70.2 }),
  c("Martin County Golf Course", { city: "Stuart", zip: "34997", lat: 27.1720, lng: -80.2370, par: 72, slope: 122, rating: 69.5 }),
  c("Club Med at Sandpiper Bay", { city: "Port St. Lucie", zip: "34952", lat: 27.2760, lng: -80.2920, par: 72, slope: 126, rating: 70.5 }),

  // ────────────────────────────────────────────────────────────────
  //  NAPLES / SOUTHWEST FLORIDA
  // ────────────────────────────────────────────────────────────────

  // Tiburon
  c("Tiburon Golf Club - Black Course", { club: "Tiburon Golf Club", city: "Naples", zip: "34110", lat: 26.2590, lng: -81.7930, par: 72, slope: 138, rating: 73.8, web: "https://www.ritzcarlton.com/naples" }),
  c("Tiburon Golf Club - Gold Course", { club: "Tiburon Golf Club", city: "Naples", zip: "34110", lat: 26.2570, lng: -81.7910, par: 72, slope: 134, rating: 72.5 }),

  // Lely Resort
  c("Lely Resort - Flamingo Island Course", { club: "Lely Resort Golf & Country Club", city: "Naples", zip: "34113", lat: 26.1050, lng: -81.6870, par: 72, slope: 132, rating: 72.0, web: "https://www.lelyresort.net" }),
  c("Lely Resort - Mustang Course", { club: "Lely Resort Golf & Country Club", city: "Naples", zip: "34113", lat: 26.1030, lng: -81.6850, par: 72, slope: 129, rating: 71.2 }),

  // Mediterra
  c("The Club at Mediterra - North Course", { club: "The Club at Mediterra", city: "Naples", zip: "34110", lat: 26.2750, lng: -81.7870, par: 72, slope: 137, rating: 73.5 }),
  c("The Club at Mediterra - South Course", { club: "The Club at Mediterra", city: "Naples", zip: "34110", lat: 26.2730, lng: -81.7850, par: 72, slope: 133, rating: 72.2 }),

  // Standalone Naples/SW
  c("TPC Treviso Bay", { city: "Naples", zip: "34113", lat: 26.0960, lng: -81.6920, par: 72, slope: 142, rating: 74.8, web: "https://www.tpctrevisobay.com" }),
  c("Naples Beach Hotel Golf Club", { city: "Naples", zip: "34102", lat: 26.1780, lng: -81.7980, par: 72, slope: 123, rating: 69.8 }),
  c("Pelican's Nest Golf Club - Hurricane", { club: "Pelican's Nest Golf Club", city: "Bonita Springs", zip: "34134", lat: 26.3350, lng: -81.7660, par: 72, slope: 132, rating: 72.0 }),
  c("Pelican's Nest Golf Club - Seminole", { club: "Pelican's Nest Golf Club", city: "Bonita Springs", zip: "34134", lat: 26.3370, lng: -81.7680, par: 72, slope: 129, rating: 71.2 }),
  c("Raptor Bay Golf Club", { city: "Bonita Springs", zip: "34134", lat: 26.3430, lng: -81.8150, par: 72, slope: 130, rating: 71.5 }),
  c("Old Corkscrew Golf Club", { city: "Estero", zip: "33928", lat: 26.4450, lng: -81.6310, par: 72, slope: 138, rating: 74.0 }),
  c("Fiddlesticks Country Club - Long Mean", { club: "Fiddlesticks Country Club", city: "Fort Myers", zip: "33912", lat: 26.5020, lng: -81.8280, par: 72, slope: 133, rating: 72.5 }),
  c("Gateway Golf & Country Club", { city: "Fort Myers", zip: "33913", lat: 26.5610, lng: -81.7680, par: 72, slope: 131, rating: 71.8 }),
  c("Shell Point Golf Club", { city: "Fort Myers", zip: "33908", lat: 26.4550, lng: -81.9200, par: 72, slope: 119, rating: 68.5 }),

  // ────────────────────────────────────────────────────────────────
  //  TAMPA BAY / CENTRAL WEST
  // ────────────────────────────────────────────────────────────────

  c("TPC Tampa Bay", { city: "Lutz", zip: "33558", lat: 28.1380, lng: -82.4820, par: 71, slope: 133, rating: 72.5, web: "https://www.tpctampabay.com" }),

  // Innisbrook
  c("Innisbrook - Copperhead Course", { club: "Innisbrook Resort", city: "Palm Harbor", zip: "34684", lat: 28.1050, lng: -82.7440, par: 71, slope: 140, rating: 74.0, web: "https://www.innisbrookgolfresort.com", phone: "727-942-2000" }),
  c("Innisbrook - Island Course", { club: "Innisbrook Resort", city: "Palm Harbor", zip: "34684", lat: 28.1030, lng: -82.7420, par: 72, slope: 132, rating: 72.0 }),

  // Streamsong
  c("Streamsong - Red Course", { club: "Streamsong Resort", city: "Bowling Green", zip: "33834", lat: 27.6190, lng: -81.8020, par: 73, slope: 148, rating: 76.7, web: "https://www.streamsongresort.com" }),
  c("Streamsong - Blue Course", { club: "Streamsong Resort", city: "Bowling Green", zip: "33834", lat: 27.6210, lng: -81.8040, par: 72, slope: 146, rating: 76.2 }),
  c("Streamsong - Black Course", { club: "Streamsong Resort", city: "Bowling Green", zip: "33834", lat: 27.6170, lng: -81.8000, par: 73, slope: 150, rating: 77.1 }),

  // World Woods
  c("World Woods - Pine Barrens Course", { club: "World Woods Golf Club", city: "Brooksville", zip: "34614", lat: 28.5530, lng: -82.4430, par: 71, slope: 140, rating: 73.5, web: "https://www.worldwoods.com" }),
  c("World Woods - Rolling Oaks Course", { club: "World Woods Golf Club", city: "Brooksville", zip: "34614", lat: 28.5550, lng: -82.4450, par: 72, slope: 133, rating: 72.0 }),

  // Saddlebrook
  c("Saddlebrook - Palmer Course", { club: "Saddlebrook Resort", city: "Wesley Chapel", zip: "33543", lat: 28.2670, lng: -82.4320, par: 71, slope: 132, rating: 72.0, web: "https://www.saddlebrook.com" }),
  c("Saddlebrook - Saddlebrook Course", { club: "Saddlebrook Resort", city: "Wesley Chapel", zip: "33543", lat: 28.2650, lng: -82.4300, par: 70, slope: 127, rating: 70.5 }),

  // Other Tampa
  c("Westchase Golf Club", { city: "Tampa", zip: "33626", lat: 28.0640, lng: -82.6210, par: 72, slope: 130, rating: 71.5 }),
  c("Cove Cay Golf Club", { city: "Clearwater", zip: "33760", lat: 27.8870, lng: -82.6840, par: 71, slope: 118, rating: 68.0 }),
  c("Bardmoor Golf & Tennis Club", { city: "Largo", zip: "33777", lat: 27.8350, lng: -82.7510, par: 72, slope: 127, rating: 70.8 }),
  c("East Lake Woodlands Country Club", { city: "Oldsmar", zip: "34677", lat: 28.0460, lng: -82.6690, par: 72, slope: 130, rating: 71.5 }),
  c("Cheval Golf & Athletic Club", { city: "Lutz", zip: "33558", lat: 28.1580, lng: -82.5340, par: 72, slope: 132, rating: 72.0 }),
  c("Countryside Golf & Country Club", { city: "Clearwater", zip: "33764", lat: 27.8960, lng: -82.7350, par: 72, slope: 125, rating: 70.2 }),

  // ────────────────────────────────────────────────────────────────
  //  ORLANDO / CENTRAL FLORIDA
  // ────────────────────────────────────────────────────────────────

  // Bay Hill
  c("Bay Hill Club - Championship Course", { club: "Arnold Palmer's Bay Hill Club", city: "Orlando", zip: "32819", lat: 28.4600, lng: -81.5180, par: 72, slope: 141, rating: 74.5, web: "https://www.bayhill.com" }),

  // Walt Disney World
  c("Walt Disney World - Palm Course", { club: "Walt Disney World Golf", city: "Lake Buena Vista", zip: "32830", lat: 28.3810, lng: -81.5560, par: 72, slope: 133, rating: 72.5, web: "https://www.golfwdw.com" }),
  c("Walt Disney World - Magnolia Course", { club: "Walt Disney World Golf", city: "Lake Buena Vista", zip: "32830", lat: 28.3830, lng: -81.5580, par: 72, slope: 136, rating: 73.5 }),
  c("Walt Disney World - Lake Buena Vista Course", { club: "Walt Disney World Golf", city: "Lake Buena Vista", zip: "32830", lat: 28.3790, lng: -81.5540, par: 72, slope: 128, rating: 71.0 }),

  // Orange County National
  c("Orange County National - Panther Lake", { club: "Orange County National Golf Center", city: "Winter Garden", zip: "34787", lat: 28.4810, lng: -81.5850, par: 72, slope: 137, rating: 73.8, web: "https://www.ocngolf.com" }),
  c("Orange County National - Crooked Cat", { club: "Orange County National Golf Center", city: "Winter Garden", zip: "34787", lat: 28.4830, lng: -81.5870, par: 72, slope: 140, rating: 74.5 }),

  // Grand Cypress
  c("Grand Cypress - North Course", { club: "Grand Cypress Golf Club", city: "Orlando", zip: "32836", lat: 28.3870, lng: -81.5100, par: 72, slope: 130, rating: 71.5, web: "https://www.grandcypress.com" }),
  c("Grand Cypress - South Course", { club: "Grand Cypress Golf Club", city: "Orlando", zip: "32836", lat: 28.3850, lng: -81.5080, par: 72, slope: 128, rating: 71.0 }),
  c("Grand Cypress - East Course", { club: "Grand Cypress Golf Club", city: "Orlando", zip: "32836", lat: 28.3890, lng: -81.5120, par: 72, slope: 126, rating: 70.5 }),
  c("Grand Cypress - New Course", { club: "Grand Cypress Golf Club", city: "Orlando", zip: "32836", lat: 28.3910, lng: -81.5140, par: 72, slope: 133, rating: 72.5 }),

  // Reunion Resort
  c("Reunion Resort - Watson Course", { club: "Reunion Resort", city: "Kissimmee", zip: "34747", lat: 28.3110, lng: -81.5870, par: 72, slope: 136, rating: 73.2, web: "https://www.reunionresort.com" }),
  c("Reunion Resort - Palmer Course", { club: "Reunion Resort", city: "Kissimmee", zip: "34747", lat: 28.3090, lng: -81.5850, par: 72, slope: 132, rating: 72.0 }),
  c("Reunion Resort - Nicklaus Course", { club: "Reunion Resort", city: "Kissimmee", zip: "34747", lat: 28.3130, lng: -81.5890, par: 72, slope: 139, rating: 74.0 }),

  // ChampionsGate
  c("ChampionsGate - International Course", { club: "ChampionsGate Golf Club", city: "Davenport", zip: "33896", lat: 28.3020, lng: -81.6100, par: 72, slope: 138, rating: 73.8, web: "https://www.championsgategolf.com" }),
  c("ChampionsGate - National Course", { club: "ChampionsGate Golf Club", city: "Davenport", zip: "33896", lat: 28.3000, lng: -81.6080, par: 72, slope: 135, rating: 73.0 }),

  // Other Orlando
  c("Shingle Creek Golf Club", { city: "Orlando", zip: "32819", lat: 28.4170, lng: -81.4380, par: 72, slope: 131, rating: 72.0, web: "https://www.shinglecreekgolf.com" }),
  c("Falcon's Fire Golf Club", { city: "Kissimmee", zip: "34746", lat: 28.3230, lng: -81.4690, par: 72, slope: 130, rating: 71.5 }),
  c("Celebration Golf Club", { city: "Celebration", zip: "34747", lat: 28.3160, lng: -81.5320, par: 72, slope: 128, rating: 71.0 }),
  c("MetroWest Golf Club", { city: "Orlando", zip: "32835", lat: 28.5210, lng: -81.4640, par: 72, slope: 129, rating: 71.2 }),
  c("Dubsdread Golf Course", { city: "Orlando", zip: "32804", lat: 28.5650, lng: -81.3930, par: 70, slope: 120, rating: 68.5 }),
  c("Rio Pinar Country Club", { city: "Orlando", zip: "32822", lat: 28.5080, lng: -81.3180, par: 72, slope: 132, rating: 72.5 }),
  c("Eagle Creek Golf Club", { city: "Orlando", zip: "32832", lat: 28.4050, lng: -81.2810, par: 72, slope: 127, rating: 70.8 }),

  // ────────────────────────────────────────────────────────────────
  //  JACKSONVILLE / NORTHEAST FLORIDA
  // ────────────────────────────────────────────────────────────────

  // TPC Sawgrass
  c("TPC Sawgrass - Stadium Course", { club: "TPC Sawgrass", city: "Ponte Vedra Beach", zip: "32082", lat: 30.1970, lng: -81.3940, par: 72, slope: 148, rating: 76.8, web: "https://www.tpc.com/sawgrass", phone: "904-273-3235" }),
  c("TPC Sawgrass - Dye's Valley Course", { club: "TPC Sawgrass", city: "Ponte Vedra Beach", zip: "32082", lat: 30.1950, lng: -81.3920, par: 72, slope: 136, rating: 73.5 }),

  // Ponte Vedra Inn
  c("Ponte Vedra Inn - Ocean Course", { club: "Ponte Vedra Inn & Club", city: "Ponte Vedra Beach", zip: "32082", lat: 30.2170, lng: -81.3760, par: 72, slope: 131, rating: 72.0, web: "https://www.pontevedra.com" }),
  c("Ponte Vedra Inn - Lagoon Course", { club: "Ponte Vedra Inn & Club", city: "Ponte Vedra Beach", zip: "32082", lat: 30.2150, lng: -81.3780, par: 72, slope: 126, rating: 70.5 }),

  // World Golf Village
  c("World Golf Village - King & Bear", { club: "World Golf Village", city: "St. Augustine", zip: "32092", lat: 29.9550, lng: -81.4960, par: 72, slope: 138, rating: 74.0, web: "https://www.worldgolfvillage.com" }),
  c("World Golf Village - Slammer & Squire", { club: "World Golf Village", city: "St. Augustine", zip: "32092", lat: 29.9530, lng: -81.4940, par: 72, slope: 133, rating: 72.5 }),

  // Other Jacksonville
  c("Jacksonville Beach Golf Club", { city: "Jacksonville Beach", zip: "32250", lat: 30.2740, lng: -81.4050, par: 72, slope: 120, rating: 68.5 }),
  c("Queen's Harbour Yacht & Country Club", { city: "Jacksonville", zip: "32225", lat: 30.3620, lng: -81.4430, par: 72, slope: 132, rating: 72.0 }),
  c("Marsh Landing Country Club", { city: "Ponte Vedra Beach", zip: "32082", lat: 30.2280, lng: -81.3900, par: 72, slope: 134, rating: 72.5 }),
  c("Amelia Island Plantation - Oak Marsh", { club: "Amelia Island Plantation", city: "Amelia Island", zip: "32034", lat: 30.5960, lng: -81.4350, par: 72, slope: 131, rating: 71.8 }),
  c("Amelia Island Plantation - Ocean Links", { club: "Amelia Island Plantation", city: "Amelia Island", zip: "32034", lat: 30.5940, lng: -81.4330, par: 72, slope: 128, rating: 71.0 }),

  // ────────────────────────────────────────────────────────────────
  //  TREASURE COAST / SPACE COAST
  // ────────────────────────────────────────────────────────────────

  c("Vero Beach Hotel & Spa Golf Club", { city: "Vero Beach", zip: "32963", lat: 27.6390, lng: -80.3670, par: 72, slope: 124, rating: 70.0 }),
  c("Indian River Club", { city: "Vero Beach", zip: "32963", lat: 27.6510, lng: -80.3870, par: 72, slope: 128, rating: 71.0 }),
  c("Duran Golf Club", { city: "Viera", zip: "32940", lat: 28.2530, lng: -80.7320, par: 72, slope: 130, rating: 71.5 }),
  c("Baytree National Golf Links", { city: "Melbourne", zip: "32940", lat: 28.2130, lng: -80.6850, par: 72, slope: 134, rating: 72.5 }),
  c("Habitat Golf Course at Valkaria", { city: "Valkaria", zip: "32950", lat: 27.9610, lng: -80.5640, par: 72, slope: 127, rating: 70.8 }),
  c("Aquarina Beach & Country Club", { city: "Melbourne Beach", zip: "32951", lat: 27.9120, lng: -80.5010, par: 72, slope: 124, rating: 70.0 }),

  // ────────────────────────────────────────────────────────────────
  //  PANHANDLE / NORTH FLORIDA
  // ────────────────────────────────────────────────────────────────

  c("Sandestin - Raven Golf Club", { club: "Sandestin Golf & Beach Resort", city: "Destin", zip: "32550", lat: 30.3780, lng: -86.3200, par: 72, slope: 137, rating: 73.5, web: "https://www.sandestin.com" }),
  c("Sandestin - Links Course", { club: "Sandestin Golf & Beach Resort", city: "Destin", zip: "32550", lat: 30.3760, lng: -86.3180, par: 72, slope: 128, rating: 71.0 }),
  c("Sandestin - Baytowne Course", { club: "Sandestin Golf & Beach Resort", city: "Destin", zip: "32550", lat: 30.3800, lng: -86.3220, par: 72, slope: 125, rating: 70.2 }),
  c("Camp Creek Golf Club", { city: "Panama City Beach", zip: "32413", lat: 30.2350, lng: -85.9870, par: 72, slope: 140, rating: 74.2 }),
  c("Regatta Bay Golf & Yacht Club", { city: "Destin", zip: "32541", lat: 30.3880, lng: -86.4490, par: 72, slope: 130, rating: 71.5 }),
  c("Kelly Plantation Golf Club", { city: "Destin", zip: "32541", lat: 30.3920, lng: -86.4710, par: 72, slope: 135, rating: 73.0 }),
  c("Pensacola Country Club", { city: "Pensacola", zip: "32503", lat: 30.4340, lng: -87.2110, par: 72, slope: 127, rating: 70.8 }),
  c("Tiger Point Golf Club", { city: "Gulf Breeze", zip: "32563", lat: 30.3550, lng: -87.0800, par: 72, slope: 130, rating: 71.5 }),
  c("Perdido Bay Golf Club", { city: "Pensacola", zip: "32507", lat: 30.3210, lng: -87.3960, par: 72, slope: 131, rating: 72.0 }),

  // ────────────────────────────────────────────────────────────────
  //  ADDITIONAL SOUTH FLORIDA COURSES
  // ────────────────────────────────────────────────────────────────

  // More PBC
  c("The Country Club at Mirasol", { city: "Palm Beach Gardens", zip: "33418", lat: 26.8500, lng: -80.1560, par: 72, slope: 131, rating: 71.8 }),
  c("Bear Lakes Country Club - Links", { club: "Bear Lakes Country Club", city: "West Palm Beach", zip: "33412", lat: 26.8060, lng: -80.1310, par: 72, slope: 129, rating: 71.0 }),
  c("Bear Lakes Country Club - Lakes", { club: "Bear Lakes Country Club", city: "West Palm Beach", zip: "33412", lat: 26.8040, lng: -80.1290, par: 72, slope: 126, rating: 70.5 }),
  c("Breakers West Country Club", { city: "West Palm Beach", zip: "33411", lat: 26.7130, lng: -80.1230, par: 72, slope: 134, rating: 72.5 }),
  c("Wanderers Club", { city: "Wellington", zip: "33414", lat: 26.6610, lng: -80.2410, par: 72, slope: 130, rating: 71.5 }),
  c("Royal Palm Beach Pines Golf Course", { city: "Royal Palm Beach", zip: "33411", lat: 26.6920, lng: -80.2350, par: 30, holes: 9, slope: null, rating: null }),
  c("Palm Beach National Golf & Country Club", { city: "Lake Worth", zip: "33467", lat: 26.5770, lng: -80.1510, par: 72, slope: 127, rating: 70.8 }),
  c("Fountains Country Club - North", { club: "Fountains Country Club", city: "Lake Worth", zip: "33467", lat: 26.5690, lng: -80.1470, par: 72, slope: 124, rating: 70.0 }),
  c("Fountains Country Club - South", { club: "Fountains Country Club", city: "Lake Worth", zip: "33467", lat: 26.5670, lng: -80.1450, par: 72, slope: 121, rating: 69.2 }),
  c("Aberdeen Golf & Country Club - East", { club: "Aberdeen Golf & Country Club", city: "Boynton Beach", zip: "33472", lat: 26.5310, lng: -80.1610, par: 72, slope: 126, rating: 70.5 }),
  c("Aberdeen Golf & Country Club - West", { club: "Aberdeen Golf & Country Club", city: "Boynton Beach", zip: "33472", lat: 26.5290, lng: -80.1630, par: 72, slope: 123, rating: 69.8 }),
  c("Boca Rio Golf Club", { city: "Boca Raton", zip: "33433", lat: 26.3620, lng: -80.1380, par: 72, slope: 127, rating: 70.8 }),
  c("Boca Country Club", { city: "Boca Raton", zip: "33434", lat: 26.3670, lng: -80.1560, par: 72, slope: 122, rating: 69.5 }),
  c("Woodfield Country Club", { city: "Boca Raton", zip: "33496", lat: 26.3990, lng: -80.1620, par: 72, slope: 133, rating: 72.0 }),
  c("St. Andrews Club", { city: "Boca Raton", zip: "33434", lat: 26.3850, lng: -80.1350, par: 72, slope: 126, rating: 70.5 }),

  // More Broward
  c("Parkland Golf & Country Club", { city: "Parkland", zip: "33076", lat: 26.3040, lng: -80.2540, par: 72, slope: 134, rating: 72.5 }),
  c("Coral Ridge Country Club", { city: "Fort Lauderdale", zip: "33308", lat: 26.1780, lng: -80.1230, par: 72, slope: 128, rating: 71.0 }),
  c("Hillcrest Golf & Country Club", { city: "Hollywood", zip: "33021", lat: 26.0310, lng: -80.1970, par: 72, slope: 125, rating: 70.2 }),
  c("Sabal Palm Golf Course", { city: "Tamarac", zip: "33321", lat: 26.2180, lng: -80.2470, par: 72, slope: 118, rating: 68.0 }),

  // ────────────────────────────────────────────────────────────────
  //  SARASOTA / MANATEE
  // ────────────────────────────────────────────────────────────────
  c("TPC Prestancia - Stadium Course", { club: "TPC Prestancia", city: "Sarasota", zip: "34238", lat: 27.2680, lng: -82.4670, par: 72, slope: 134, rating: 72.5, web: "https://www.tpcprestancia.com" }),
  c("TPC Prestancia - Players Course", { club: "TPC Prestancia", city: "Sarasota", zip: "34238", lat: 27.2660, lng: -82.4650, par: 72, slope: 127, rating: 70.8 }),
  c("The Concession Golf Club", { city: "Bradenton", zip: "34202", lat: 27.4210, lng: -82.4060, par: 72, slope: 145, rating: 75.5 }),
  c("Lakewood Ranch Golf & Country Club", { city: "Lakewood Ranch", zip: "34202", lat: 27.3890, lng: -82.4080, par: 72, slope: 130, rating: 71.5 }),
  c("Heritage Harbour Golf Club", { city: "Bradenton", zip: "34212", lat: 27.4530, lng: -82.4920, par: 72, slope: 128, rating: 71.0 }),
  c("Ritz-Carlton Members Club", { city: "Bradenton", zip: "34202", lat: 27.4180, lng: -82.4010, par: 72, slope: 136, rating: 73.0 }),
  c("Bobby Jones Golf Complex - British", { club: "Bobby Jones Golf Complex", city: "Sarasota", zip: "34234", lat: 27.3490, lng: -82.5210, par: 72, slope: 124, rating: 70.0 }),
  c("Bobby Jones Golf Complex - American", { club: "Bobby Jones Golf Complex", city: "Sarasota", zip: "34234", lat: 27.3510, lng: -82.5230, par: 72, slope: 121, rating: 69.2 }),
  c("University Park Country Club", { city: "University Park", zip: "34201", lat: 27.3710, lng: -82.4430, par: 72, slope: 129, rating: 71.2 }),

  // ────────────────────────────────────────────────────────────────
  //  GAINESVILLE / OCALA
  // ────────────────────────────────────────────────────────────────
  c("Mark Bostick Golf Course at UF", { city: "Gainesville", zip: "32607", lat: 29.6380, lng: -82.3710, par: 72, slope: 127, rating: 70.8 }),
  c("Ironwood Golf Course", { city: "Gainesville", zip: "32653", lat: 29.7020, lng: -82.3950, par: 72, slope: 123, rating: 69.5 }),
  c("Golden Ocala Golf & Equestrian Club", { city: "Ocala", zip: "34482", lat: 29.2330, lng: -82.2290, par: 72, slope: 137, rating: 73.5 }),

  // ────────────────────────────────────────────────────────────────
  //  TALLAHASSEE & OTHER NORTH FL
  // ────────────────────────────────────────────────────────────────
  c("Southwood Golf Club", { city: "Tallahassee", zip: "32311", lat: 30.3890, lng: -84.2310, par: 72, slope: 131, rating: 72.0 }),
  c("Golden Eagle Country Club", { city: "Tallahassee", zip: "32312", lat: 30.5120, lng: -84.2540, par: 72, slope: 133, rating: 72.5 }),
  c("Killearn Country Club", { city: "Tallahassee", zip: "32309", lat: 30.4840, lng: -84.2030, par: 72, slope: 128, rating: 71.0 }),
  c("SummerBrooke Golf Club", { city: "Tallahassee", zip: "32312", lat: 30.5080, lng: -84.2480, par: 72, slope: 126, rating: 70.5 }),

  // ────────────────────────────────────────────────────────────────
  //  KEYS
  // ────────────────────────────────────────────────────────────────
  c("Key West Golf Club", { city: "Key West", zip: "33040", lat: 24.5690, lng: -81.7560, par: 70, slope: 124, rating: 69.5 }),

];

// ═══════════════════════════════════════════════════════════════════
//  SEED EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function seed() {
  console.log(`\nSeeding ${courses.length} Florida golf courses into Supabase...\n`);

  // Ensure unique constraint exists for upsert to work
  console.log("  Ensuring unique constraint on (name, city)...");
  const { error: constraintErr } = await supabase.rpc("exec_sql", {
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courses_name_city_unique'
      ) THEN
        ALTER TABLE public.courses ADD CONSTRAINT courses_name_city_unique UNIQUE (name, city);
      END IF;
    END $$;`,
  });
  if (constraintErr) {
    // If rpc doesn't exist, try direct — the constraint may already be there
    console.log("  Note: Could not create constraint via RPC (may already exist or need manual creation).");
    console.log("  If upsert fails, run this SQL in Supabase dashboard:");
    console.log("    ALTER TABLE public.courses ADD CONSTRAINT courses_name_city_unique UNIQUE (name, city);");
    console.log("");
  } else {
    console.log("  Constraint ready.\n");
  }

  // Upsert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < courses.length; i += BATCH) {
    const batch = courses.slice(i, i + BATCH);

    const { data, error } = await supabase
      .from("courses")
      .upsert(batch, {
        onConflict: "name,city",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += (data?.length || batch.length);
      console.log(`  Batch ${Math.floor(i / BATCH) + 1}: upserted ${data?.length || batch.length} courses`);
    }
  }

  console.log(`\nDone! ${inserted} courses upserted, ${errors} errors.\n`);
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
