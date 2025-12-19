
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import twilio from "twilio";

// Prevent caching for webhooks
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    // WhatsApp Webhook Disabled (Migration to Email)
    return new NextResponse("Webhook Disabled", { status: 200 });
}
