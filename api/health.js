// Vercel Serverless Function: Anti-Sleep Health Check
// Path: /api/health
// Purpose: Pings Supabase PostgreSQL database to prevent 7-day inactivity sleep on free tier

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      status: 'healthy_standby',
      application: 'Ayurvedic Unani Services, District Dehradun',
      timestamp: new Date().toISOString(),
      message:
        'Health endpoint active. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables for live database keep-alive.',
      latency_ms: Date.now() - startTime,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Lightweight keep-alive query against hospitals_master
    const { count, error } = await supabase
      .from('hospitals_master')
      .select('*', { count: 'exact', head: true })
      .like('contact_phone', 'DDN%');


    if (error) {
      throw error;
    }

    const latency = Date.now() - startTime;

    return res.status(200).json({
      status: 'ok',
      application: 'Ayurvedic Unani Services, District Dehradun',
      project_id: 'ayurvedic_unani_dehradun',
      timestamp: new Date().toISOString(),
      database: 'connected',
      hospitals_count: count,
      latency_ms: latency,
      anti_sleep_keep_alive: 'SUCCESS - Supabase inactivity counter reset',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'database_ping_error',
      application: 'Ayurvedic Unani Services, District Dehradun',
      timestamp: new Date().toISOString(),
      error: err.message || 'Error querying database',
      latency_ms: Date.now() - startTime,
    });
  }
}
