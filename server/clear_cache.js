import redis from './lib/redis.js';

async function run() {
  const keys = await redis.keys('stats:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Deleted ${keys.length} stats keys`);
  } else {
    console.log('No stats keys found');
  }
  
  const lbKeys = await redis.keys('leaderboard:*');
  if (lbKeys.length > 0) {
    await redis.del(...lbKeys);
    console.log(`Deleted ${lbKeys.length} leaderboard keys`);
  }
  
  process.exit(0);
}

run().catch(console.error);
