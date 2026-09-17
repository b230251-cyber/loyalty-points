import { getDatabase } from '../db/database.js';
import { MemberService } from '../domain/memberService.js';
import { TierEngine } from '../domain/tierEngine.js';

async function runBenchmark() {
  console.log('⚡ Starting Large Member List Phone Lookup Benchmark...');
  const db = await getDatabase('', true); // in-memory
  const tierEngine = new TierEngine();
  const memberService = new MemberService(db, tierEngine);

  const MEMBER_COUNT = 15000;
  console.log(`📦 Seeding ${MEMBER_COUNT.toLocaleString()} members for benchmark...`);

  const seedTx = db.transaction(() => {
    for (let i = 1; i <= MEMBER_COUNT; i++) {
      const phone = `415${String(1000000 + i).slice(1)}`;
      db.prepare(`
        INSERT INTO members (id, phone_number, name, email, current_balance, lifetime_points, tier, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`m-${i}`, phone, `Benchmark Member ${i}`, `m${i}@example.com`, 250, 500, 'SILVER', '2026-01-01', '2026-01-01');
    }
  });

  const seedStart = performance.now();
  seedTx();
  console.log(`✅ Seeded ${MEMBER_COUNT.toLocaleString()} members in ${(performance.now() - seedStart).toFixed(2)}ms`);

  // Run 1,000 random lookup queries
  const NUM_QUERIES = 1000;
  console.log(`🔍 Executing ${NUM_QUERIES} random phone prefix and exact lookups...`);

  const lookupTimes: number[] = [];
  for (let q = 0; q < NUM_QUERIES; q++) {
    // Generate a search query (e.g. "41505" or "4150523")
    const randomId = Math.floor(Math.random() * MEMBER_COUNT) + 1;
    const targetPhone = `415${String(1000000 + randomId).slice(1)}`;
    const prefix = targetPhone.slice(0, 5 + (q % 3)); // 5 to 7 digits

    const start = performance.now();
    const results = memberService.searchMembersByPhone(prefix, 10);
    const elapsed = performance.now() - start;
    lookupTimes.push(elapsed);
  }

  const totalTime = lookupTimes.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / NUM_QUERIES;
  const sortedTimes = [...lookupTimes].sort((a, b) => a - b);
  const p95 = sortedTimes[Math.floor(NUM_QUERIES * 0.95)];
  const p99 = sortedTimes[Math.floor(NUM_QUERIES * 0.99)];
  const maxTime = sortedTimes[sortedTimes.length - 1];

  console.log('\n📊 === BENCHMARK RESULTS ===');
  console.log(`Total Members In Database: ${MEMBER_COUNT.toLocaleString()}`);
  console.log(`Total Lookups Executed:     ${NUM_QUERIES.toLocaleString()}`);
  console.log(`Average Lookup Latency:     ${avgTime.toFixed(3)} ms`);
  console.log(`p95 Latency:                ${p95.toFixed(3)} ms`);
  console.log(`p99 Latency:                ${p99.toFixed(3)} ms`);
  console.log(`Max Latency:                ${maxTime.toFixed(3)} ms`);
  console.log(`Lookups Per Second (QPS):   ${(1000 / avgTime).toFixed(0)} queries/sec`);
  console.log('===========================\n');
}

runBenchmark().catch(console.error);
