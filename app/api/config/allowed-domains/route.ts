/**
 * API Route: Allowed Domains Configuration
 * Returns the list of domains that should always be allowed (Flow app domains)
 * This allows the extensions to fetch the allowed domains from the server
 * instead of having them hardcoded.
 */

import { NextResponse } from "next/server";

// Domains that should always be allowed - users need access to manage their sessions
const FLOW_ALLOWED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "vercel.app",
  "flow.anshul.space",
  "anshul.space",
  "anshulxd.fun",
  "snipp.fun",
  // Add your production domain here when deployed
  // "flow.app",
  // "yourapp.com",
];

export async function GET() {
  return NextResponse.json({
    domains: FLOW_ALLOWED_DOMAINS,
    updatedAt: new Date().toISOString(),
  });
}
