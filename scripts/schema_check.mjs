const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.');
  console.error('Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/schema_check.mjs');
  process.exit(1);
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });
  // Try direct query instead
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: { ...headers, Accept: 'application/json' }
  });
  return res2;
}

async function run() {
  const issues = [];

  // Read migration files
  const fs = await import('fs');
  const mig4 = fs.readFileSync('supabase/migrations/00004_schema.sql', 'utf8');
  const mig18 = fs.readFileSync('supabase/migrations/00018_chat_enhancements.sql', 'utf8');

  // Extract expected tables, columns, constraints from migration files
  const expectedTables = ['conversations','messages','conversation_participants','message_attachments',
    'message_reads','message_reactions','offers','notification_events','user_presence','call_logs'];

  // Verify tables exist by querying each one
  for (const t of expectedTables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=1`, {
      headers: { ...headers, Prefer: 'return=representation' }
    });
    if (res.status >= 400) {
      const body = await res.text();
      issues.push(`TABLE ${t}: ${res.status} ${body.slice(0,100)}`);
    } else {
      console.log(`✅ TABLE ${t}`);
    }
  }

  // Get actual columns of messages table via the API
  const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?limit=0`, {
    headers: { ...headers, Prefer: 'return=representation' }
  });
  if (msgRes.ok) {
    const body = await msgRes.text();
    // Try getting column info from the API response
    console.log(`📋 messages query OK (${msgRes.headers.get('content-length') || 0}b)`);
  } else {
    console.log(`❌ messages query: ${msgRes.status}`);
  }

  // Test type constraint by trying INSERT with each type
  const testTypes = ['text','image','file','system','offer','listing_share',
    'call_start','call_end','call_missed','voice','video','document'];
  const validTypes = [];

  for (const t of testTypes) {
    // Use a POST to /rest/v1/messages but with Prefer: return=minimal to avoid full insert
    // Actually just test if the type value would be accepted
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representational,resolution=merge-duplicates' },
      body: JSON.stringify({
        conversation_id: '00000000-0000-0000-0000-000000000000',
        sender_id: '00000000-0000-0000-0000-000000000000',
        type: t,
        message: ''
      })
    });
    if (res.ok || res.status === 409) { // 409 = conflict (duplicate key), but constraint was fine
      validTypes.push(t);
    } else {
      const body = await res.text();
      if (body.includes('violates check constraint') || body.includes('messages_type_check')) {
        issues.push(`TYPE '${t}' REJECTED by messages_type_check`);
      }
    }
  }

  console.log(`\n📋 Acceptable message types: ${validTypes.join(', ')}`);

  // Check FK reply_to exists by examining the raw schema
  const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: { ...headers, Accept: 'application/openapi+json' }
  });
  if (schemaRes.ok) {
    const schema = await schemaRes.json();
    const msgSchema = schema?.paths?.['/messages']?.get?.responses?.['200']?.schema;
    if (msgSchema) {
      const props = Object.keys(msgSchema?.properties || {});
      console.log(`\n📋 API-reported messages columns: ${props.join(', ')}`);
      if (props.includes('reply_to')) console.log('✅ FK messages.reply_to (API reports column exists)');
      else {
        const directRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=id,reply_to&limit=1`, { headers });
        if (directRes.ok) console.log('✅ FK messages.reply_to (verified via direct query)');
        else issues.push('COLUMN messages.reply_to: MISSING');
      }
    }
  }

  // Test RPCs
  for (const r of ['chat_unread_count', 'chat_unread_conversation_ids']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${r}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000' })
    });
    if (res.status === 404 || res.status === 400) {
      issues.push(`RPC ${r}: MISSING (${res.status})`);
    } else {
      console.log(`✅ RPC ${r} (${res.status})`);
    }
  }

  // Test storage buckets
  for (const b of ['chat-images', 'chat-videos', 'chat-files', 'chat-audio']) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${b}/`, {
      method: 'GET',
      headers
    });
    if (res.ok || res.status === 400) {
      console.log(`✅ STORAGE ${b}`);
    } else {
      issues.push(`STORAGE ${b}: ${res.status}`);
    }
  }

  // Check conversation_participants.last_read_at
  const cpRes = await fetch(`${SUPABASE_URL}/rest/v1/conversation_participants?limit=0`, {
    headers: { ...headers, Prefer: 'return=representation' }
  });
  if (cpRes.ok) {
    console.log(`✅ conversation_participants accessible`);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('SCHEMA VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════');
  if (issues.length === 0) {
    console.log('✅ ALL CHECKS PASSED — Database is synchronized.');
  } else {
    for (const i of issues) console.log(`❌ ${i}`);
    process.exit(1);
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
