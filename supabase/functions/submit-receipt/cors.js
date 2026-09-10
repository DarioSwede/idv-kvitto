const productionOrigin = "https://darioswede.github.io";
const allowedOrigins = new Set([
  productionOrigin,
  "http://localhost:43921",
  "http://localhost:43922",
  "http://127.0.0.1:43921",
  "http://127.0.0.1:43922",
]);

export const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

export const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : productionOrigin,
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
});