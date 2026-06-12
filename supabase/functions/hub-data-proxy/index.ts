import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HUB_API_BASE =
  "https://ngkcbygyoobqhlmlnuvl.supabase.co/functions/v1/planner-hub-api";

const PLANNER_TOKEN = Deno.env.get("X_PLANNER_TOKEN") ?? "";

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
    const hubUrl = `${HUB_API_BASE}/${endpoint}`;

    const hubResponse = await fetch(hubUrl, {
      method: req.method,
      headers: {
        Authorization: authHeader,
        "X-Planner-Token": PLANNER_TOKEN,
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
