/**
 * seed-pricing.mjs
 *
 * Updates all existing courses in the Supabase `courses` table with
 * pricing information: price_tier, green_fee_estimate, is_private.
 *
 * Usage:  node scripts/seed-pricing.mjs
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
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════════════════════════════
//  PRICING DATA
//
//  Each entry: { patterns: [...], tier, fee, isPrivate }
//  `patterns` are substrings matched case-insensitively against course name.
//  More specific patterns should come FIRST so they match before generic ones.
// ═══════════════════════════════════════════════════════════════════

const pricingRules = [
  // ────────────────────────────────────────────────────────────────
  //  TIER 4 ($$$$ — $200+ or Private / Membership)
  // ────────────────────────────────────────────────────────────────

  // TPC Sawgrass Stadium — elite public
  { patterns: ["TPC Sawgrass - Stadium"], tier: 4, fee: 350, isPrivate: false },

  // Private clubs (is_private = true)
  { patterns: ["Seminole Golf Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["The Bear's Club", "Bear's Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Old Palm Golf Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Jupiter Hills"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["BallenIsles"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Frenchman's Creek"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Mirasol"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Jonathan's Landing"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Everglades Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Lost City Golf Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Broken Sound"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Weston Hills"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Grande Oaks"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Trump International Golf Club"], tier: 4, fee: 250, isPrivate: false },
  { patterns: ["Wellington National"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Calusa Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Riviera Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Inverrary Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Woodlands Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Club at Mediterra"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Ibis -", "Ibis Golf"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Bear Lakes Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Aberdeen Golf"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Gleneagles Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Hunters Run"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Fountains Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Boca West"], tier: 4, fee: 0, isPrivate: true },

  // Elite public / resort (Tier 4, not private)
  { patterns: ["Breakers"], tier: 4, fee: 250, isPrivate: false },
  { patterns: ["Saddlebrook"], tier: 4, fee: 220, isPrivate: false },

  // ────────────────────────────────────────────────────────────────
  //  TIER 3 ($$$ — $100-200)
  // ────────────────────────────────────────────────────────────────

  { patterns: ["PGA National"], tier: 3, fee: 175, isPrivate: false },
  { patterns: ["Crandon Golf"], tier: 3, fee: 175, isPrivate: false },
  { patterns: ["Biltmore Golf"], tier: 3, fee: 160, isPrivate: false },
  { patterns: ["Trump National Doral"], tier: 3, fee: 195, isPrivate: false },
  { patterns: ["Turnberry Isle"], tier: 3, fee: 165, isPrivate: false },
  { patterns: ["TPC Eagle Trace"], tier: 3, fee: 150, isPrivate: false },
  { patterns: ["TPC Tampa Bay"], tier: 3, fee: 140, isPrivate: false },
  { patterns: ["TPC Treviso Bay"], tier: 3, fee: 195, isPrivate: false },
  { patterns: ["TPC Sawgrass - Dye"], tier: 3, fee: 175, isPrivate: false },
  { patterns: ["Innisbrook"], tier: 3, fee: 170, isPrivate: false },
  { patterns: ["Bay Hill"], tier: 3, fee: 180, isPrivate: false },
  { patterns: ["Streamsong"], tier: 3, fee: 195, isPrivate: false },
  { patterns: ["Tiburon Golf Club"], tier: 3, fee: 165, isPrivate: false },
  { patterns: ["Banyan Cay"], tier: 3, fee: 150, isPrivate: false },
  { patterns: ["Lely Resort"], tier: 3, fee: 140, isPrivate: false },
  { patterns: ["Orange County National"], tier: 3, fee: 145, isPrivate: false },
  { patterns: ["Grand Cypress"], tier: 3, fee: 150, isPrivate: false },
  { patterns: ["ChampionsGate"], tier: 3, fee: 140, isPrivate: false },
  { patterns: ["Reunion Resort"], tier: 3, fee: 140, isPrivate: false },
  { patterns: ["Walt Disney World"], tier: 3, fee: 135, isPrivate: false },
  { patterns: ["Ponte Vedra Inn"], tier: 3, fee: 160, isPrivate: false },
  { patterns: ["World Golf Village"], tier: 3, fee: 130, isPrivate: false },
  { patterns: ["TPC Prestancia"], tier: 3, fee: 150, isPrivate: false },
  { patterns: ["The Concession"], tier: 3, fee: 195, isPrivate: false },
  { patterns: ["PGA Golf Club"], tier: 3, fee: 130, isPrivate: false },
  { patterns: ["Camp Creek"], tier: 3, fee: 150, isPrivate: false },
  { patterns: ["World Woods"], tier: 3, fee: 120, isPrivate: false },
  { patterns: ["Golden Ocala"], tier: 3, fee: 145, isPrivate: false },
  { patterns: ["Old Corkscrew"], tier: 3, fee: 140, isPrivate: false },
  { patterns: ["Ritz-Carlton Members"], tier: 3, fee: 160, isPrivate: false },

  // ────────────────────────────────────────────────────────────────
  //  TIER 2 ($$ — $50-100)
  // ────────────────────────────────────────────────────────────────

  { patterns: ["Abacoa Golf Club"], tier: 2, fee: 75, isPrivate: false },
  { patterns: ["Heron Bay"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Deer Creek Golf Club"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Westchester Golf"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Lago Mar"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Diplomat Golf"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Colony West"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Jacaranda Golf Club"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Palm Aire Country Club"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Bonaventure Country Club"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Sandridge Golf Club"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Baytree National"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Indian River Club"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Shingle Creek"], tier: 2, fee: 75, isPrivate: false },
  { patterns: ["Duran Golf Club"], tier: 2, fee: 55, isPrivate: false },

  // More tier-2 courses
  { patterns: ["Emerald Dunes"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Osprey Point"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Winston Trails"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Polo Trace"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Delray Beach Golf"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Rolling Hills Golf"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Parkland Golf"], tier: 2, fee: 80, isPrivate: false },
  { patterns: ["Coral Ridge Country Club"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Woodfield Country Club"], tier: 2, fee: 80, isPrivate: false },
  { patterns: ["Boca Raton Resort"], tier: 2, fee: 90, isPrivate: false },
  { patterns: ["Miami Beach Golf Club"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Kelly Plantation"], tier: 2, fee: 85, isPrivate: false },
  { patterns: ["Regatta Bay"], tier: 2, fee: 80, isPrivate: false },
  { patterns: ["Sandestin"], tier: 2, fee: 85, isPrivate: false },
  { patterns: ["Amelia Island"], tier: 2, fee: 80, isPrivate: false },
  { patterns: ["Falcon's Fire"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["MetroWest Golf"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Celebration Golf"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Westchase Golf"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Lakewood Ranch"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Heritage Harbour"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["University Park"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Golden Eagle Country"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Southwood Golf"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Club Med at Sandpiper"], tier: 2, fee: 75, isPrivate: false },
  { patterns: ["Keys Gate"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Cheval Golf"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["East Lake Woodlands"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Bardmoor Golf"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Pelican's Nest"], tier: 2, fee: 75, isPrivate: false },
  { patterns: ["Raptor Bay"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Gateway Golf"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Tiger Point"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Perdido Bay"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Habitat Golf"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Eagle Creek Golf"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Rio Pinar"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Sailfish Sands"], tier: 2, fee: 50, isPrivate: false },
  { patterns: ["Marsh Landing"], tier: 2, fee: 85, isPrivate: false },
  { patterns: ["Queen's Harbour"], tier: 2, fee: 80, isPrivate: false },
  { patterns: ["Vero Beach Hotel"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Fiddlesticks"], tier: 2, fee: 75, isPrivate: false },

  // ────────────────────────────────────────────────────────────────
  //  TIER 1 ($ — Under $50)
  // ────────────────────────────────────────────────────────────────

  { patterns: ["Okeeheelee"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Park Ridge Golf"], tier: 1, fee: 25, isPrivate: false },
  { patterns: ["Palm Beach Par 3"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Palmetto Golf Course"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Melreese Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Country Club of Miami"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Orangebrook"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Normandy Shores"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Links at Madison Green"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Sandhill Crane"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Village Golf Club"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Shula's Golf"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Sabal Palm Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Lake Worth Beach Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Lakeview Golf Club"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["North Palm Beach Country Club"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Royal Palm Beach Pines"], tier: 1, fee: 20, isPrivate: false },
  { patterns: ["Kendall Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Killian Greens"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Pembroke Lakes"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Davie Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Hillcrest Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Dubsdread Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Jacksonville Beach Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Bobby Jones Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Cove Cay Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Countryside Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Shell Point Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Martin County Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Mark Bostick"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Ironwood Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Pensacola Country Club"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["SummerBrooke"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Killearn Country Club"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Key West Golf"], tier: 1, fee: 45, isPrivate: false },
  { patterns: ["Redland Golf"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Doral Park Golf"], tier: 1, fee: 40, isPrivate: false },
  { patterns: ["Miccosukee Golf"], tier: 1, fee: 35, isPrivate: false },
  { patterns: ["Boca Dunes"], tier: 1, fee: 30, isPrivate: false },
  { patterns: ["Naples Beach Hotel"], tier: 1, fee: 45, isPrivate: false },
  { patterns: ["Aquarina"], tier: 1, fee: 35, isPrivate: false },

  // Other private clubs not listed above
  { patterns: ["Palm Beach Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Mayacoo Lakes"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["The Falls Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Ironhorse Country Club"], tier: 4, fee: 0, isPrivate: true },
  { patterns: ["Atlantis Country Club"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Indian Spring Country Club"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Cypress Creek Country Club"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Fort Lauderdale Country Club"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Palm Beach National"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Boca Rio Golf"], tier: 2, fee: 65, isPrivate: false },
  { patterns: ["Boca Country Club"], tier: 2, fee: 55, isPrivate: false },
  { patterns: ["Boca Greens"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["St. Andrews Club"], tier: 2, fee: 60, isPrivate: false },
  { patterns: ["Wanderers Club"], tier: 2, fee: 70, isPrivate: false },
  { patterns: ["Breakers West"], tier: 3, fee: 120, isPrivate: false },
  { patterns: ["The Country Club at Mirasol"], tier: 4, fee: 0, isPrivate: true },
];

// ═══════════════════════════════════════════════════════════════════
//  MATCHING LOGIC
// ═══════════════════════════════════════════════════════════════════

/**
 * Given a course name, find the first matching pricing rule.
 * Returns { tier, fee, isPrivate } or null if no match.
 */
function findPricing(courseName) {
  const lower = courseName.toLowerCase();
  for (const rule of pricingRules) {
    for (const pattern of rule.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return { tier: rule.tier, fee: rule.fee, isPrivate: rule.isPrivate };
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  SEED EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function seed() {
  // 1. Fetch all courses
  console.log("\nFetching all courses from Supabase...");
  const { data: courses, error: fetchErr } = await supabase
    .from("courses")
    .select("id, name")
    .order("name");

  if (fetchErr) {
    console.error("Failed to fetch courses:", fetchErr.message);
    process.exit(1);
  }

  console.log(`Found ${courses.length} courses.\n`);

  // 2. Build update payloads
  const updates = [];
  let matched = 0;
  let defaulted = 0;

  for (const course of courses) {
    const pricing = findPricing(course.name);
    if (pricing) {
      updates.push({
        id: course.id,
        name: course.name,
        price_tier: pricing.tier,
        green_fee_estimate: pricing.fee,
        is_private: pricing.isPrivate,
      });
      matched++;
    } else {
      // Default: tier 2, $75, not private
      updates.push({
        id: course.id,
        name: course.name,
        price_tier: 2,
        green_fee_estimate: 75,
        is_private: false,
      });
      defaulted++;
    }
  }

  console.log(`  Matched: ${matched} courses with specific pricing`);
  console.log(`  Defaulted: ${defaulted} courses to tier 2 / $75\n`);

  // Log the defaulted ones so we can review
  if (defaulted > 0) {
    console.log("  Courses using default pricing:");
    for (const u of updates) {
      if (!findPricing(u.name)) {
        console.log(`    - ${u.name}`);
      }
    }
    console.log("");
  }

  // 3. Run updates in batches
  const BATCH = 25;
  let success = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    const totalBatches = Math.ceil(updates.length / BATCH);

    // Update each course individually since we're matching by id
    for (const item of batch) {
      const { error } = await supabase
        .from("courses")
        .update({
          price_tier: item.price_tier,
          green_fee_estimate: item.green_fee_estimate,
          is_private: item.is_private,
        })
        .eq("id", item.id);

      if (error) {
        console.error(`  Error updating "${item.name}": ${error.message}`);
        errors++;
      } else {
        success++;
      }
    }

    console.log(`  Batch ${batchNum}/${totalBatches} — updated ${batch.length} courses`);
  }

  console.log(`\nDone! ${success} updated, ${errors} errors.\n`);

  // 4. Print summary by tier
  const tierCounts = [0, 0, 0, 0, 0];
  const privateCt = updates.filter((u) => u.is_private).length;
  for (const u of updates) tierCounts[u.price_tier]++;

  console.log("Summary:");
  console.log(`  Tier 1 ($)    — ${tierCounts[1]} courses`);
  console.log(`  Tier 2 ($$)   — ${tierCounts[2]} courses`);
  console.log(`  Tier 3 ($$$)  — ${tierCounts[3]} courses`);
  console.log(`  Tier 4 ($$$$) — ${tierCounts[4]} courses`);
  console.log(`  Private clubs — ${privateCt} courses`);
  console.log("");
}

seed().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
