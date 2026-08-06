import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * The service-role Supabase client, built on first use rather than at
 * module import.
 *
 * The laziness is the point. `next build`'s "collecting page data" phase
 * imports every route module to read its config, so validating these env
 * vars at module scope crashed the entire build whenever they weren't
 * present -- even though nothing here talks to Supabase until a request
 * actually arrives. Any route that merely imports this *transitively*
 * (e.g. /api/game/[gameId]/next-batch, via questionSourcing.ts) took the
 * whole build down with it, which is what broke preview deployments whose
 * env scope didn't match production's.
 *
 * Deferring to first call keeps a missing variable just as loud a failure,
 * but moves it to request time, where it's a 500 on one route instead of a
 * build that never ships.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
