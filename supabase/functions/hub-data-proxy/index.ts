import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HUB_API_BASE =
  "https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/planner-hub-api";

async function getPlannerToken(): Promise<string> {
  const envToken = Deno.env.get("X-PLANNER-TOKEN") ?? "";
  if (envToken) return envToken;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return "";

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", "x_planner_token")
    .maybeSingle();

  return data?.value ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");

  const allowedEndpoints = ["coach-athletes", "athlete-profile"];
  if (!endpoint || !allowedEndpoints.includes(endpoint)) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing endpoint parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const plannerToken = await getPlannerToken();
    if (!plannerToken) {
      return new Response(
        JSON.stringify({ error: "Planner token not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Forward all query params except "endpoint" to the Hub
    const forwardParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint") {
        forwardParams.set(key, value);
      }
    }
    const queryString = forwardParams.toString();
    const hubUrl = `${HUB_API_BASE}/${endpoint}${queryString ? `?${queryString}` : ""}`;

    const hubResponse = await fetch(hubUrl, {
      method: req.method,
      headers: {
        Authorization: authHeader,
        "X-Planner-Token": plannerToken,
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? await req.text() : undefined,
    });

    const data = await hubResponse.text();

    return new Response(data, {
      status: hubResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
