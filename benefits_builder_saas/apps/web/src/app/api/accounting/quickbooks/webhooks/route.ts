/**
 * QuickBooks Webhooks Handler
 *
 * Receives real-time notifications from QuickBooks when entities change
 * This enables immediate sync instead of waiting for the 3-hour cron job
 *
 * Setup Instructions:
 * 1. Register webhook URL in QuickBooks Developer Portal
 * 2. Set webhook URL: https://yourdomain.com/api/accounting/quickbooks/webhooks
 * 3. Set Webhook Verifier Token in environment: QB_WEBHOOK_VERIFIER_TOKEN
 * 4. Subscribe to entity types: Customer, Invoice, Payment, Bill, Vendor
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

const WEBHOOK_VERIFIER_TOKEN = process.env.QB_WEBHOOK_VERIFIER_TOKEN || "";

/**
 * Verify webhook signature from QuickBooks
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  verifierToken: string
): boolean {
  const hash = crypto
    .createHmac("sha256", verifierToken)
    .update(payload)
    .digest("base64");

  return hash === signature;
}

/**
 * POST - Receive webhook notifications from QuickBooks
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("intuit-signature");
    const rawBody = await request.text();

    // Verify signature
    if (!signature || !verifyWebhookSignature(rawBody, signature, WEBHOOK_VERIFIER_TOKEN)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    // QuickBooks webhook payload structure:
    // {
    //   "eventNotifications": [{
    //     "realmId": "123456",
    //     "dataChangeEvent": {
    //       "entities": [{
    //         "name": "Customer",
    //         "id": "123",
    //         "operation": "Create" | "Update" | "Delete"
    //       }]
    //     }
    //   }]
    // }

    const db = createServiceClient();
    const notifications = payload.eventNotifications || [];

    console.log(`Received ${notifications.length} webhook notification(s) from QuickBooks`);

    for (const notification of notifications) {
      const realmId = notification.realmId;
      const entities = notification.dataChangeEvent?.entities || [];

      // Find the QuickBooks connection for this realm
      const { data: connection } = await db
        .from("quickbooks_connections")
        .select("*")
        .eq("realm_id", realmId)
        .eq("status", "active")
        .single();

      if (!connection) {
        console.warn(`No active connection found for realm ${realmId}`);
        continue;
      }

      // Process each entity change
      for (const entity of entities) {
        const { name: entityType, id: entityId, operation } = entity;

        console.log(`Processing ${operation} on ${entityType} (ID: ${entityId})`);

        // Queue the entity for sync
        await db.from("quickbooks_webhook_queue").insert({
          connection_id: connection.id,
          realm_id: realmId,
          entity_type: entityType,
          entity_id: entityId,
          operation: operation,
          received_at: new Date().toISOString(),
          processed: false,
        });

        // Trigger immediate processing based on entity type
        switch (entityType) {
          case "Customer":
            await handleCustomerChange(db, connection.id, entityId, operation);
            break;

          case "Invoice":
            await handleInvoiceChange(db, connection.id, entityId, operation);
            break;

          case "Payment":
            await handlePaymentChange(db, connection.id, entityId, operation);
            break;

          case "Bill":
            await handleBillChange(db, connection.id, entityId, operation);
            break;

          case "Vendor":
            await handleVendorChange(db, connection.id, entityId, operation);
            break;

          case "Estimate":
            await handleEstimateChange(db, connection.id, entityId, operation);
            break;

          default:
            console.log(`Unhandled entity type: ${entityType}`);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle Customer entity changes
 */
async function handleCustomerChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  // Mark for re-sync in next sync cycle
  if (operation === "Update" || operation === "Delete") {
    await db
      .from("companies")
      .update({
        qb_sync_pending: true,
        qb_last_modified: new Date().toISOString(),
      })
      .eq("qb_customer_id", entityId);
  }
}

/**
 * Handle Invoice entity changes
 */
async function handleInvoiceChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  // If invoice was deleted in QB, mark it in our system
  if (operation === "Delete") {
    await db
      .from("invoices")
      .update({
        qb_synced: false,
        qb_sync_status: "deleted_in_qb",
      })
      .eq("qb_invoice_id", entityId);
  }

  // For updates, mark for verification in next sync
  if (operation === "Update") {
    await db
      .from("invoices")
      .update({
        qb_sync_pending: true,
        qb_last_modified: new Date().toISOString(),
      })
      .eq("qb_invoice_id", entityId);
  }
}

/**
 * Handle Payment entity changes
 * This is the most important one - new payments should be pulled immediately
 */
async function handlePaymentChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  // Queue for immediate payment pull
  if (operation === "Create" || operation === "Update") {
    await db.from("quickbooks_payment_queue").insert({
      connection_id: connectionId,
      qb_payment_id: entityId,
      queued_at: new Date().toISOString(),
      processed: false,
    });

    // Trigger background job to process payment immediately
    // (In production, this would call a background worker)
    console.log(`Payment ${entityId} queued for immediate processing`);
  }
}

/**
 * Handle Bill entity changes
 */
async function handleBillChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  console.log(`Bill ${entityId} ${operation} - marking for sync`);
  // Bills created in QB should be pulled in next sync
  // (Implement bill import logic based on your schema)
}

/**
 * Handle Vendor entity changes
 */
async function handleVendorChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  console.log(`Vendor ${entityId} ${operation} - marking for sync`);
  // Similar to customers
  if (operation === "Update" || operation === "Delete") {
    await db
      .from("vendors")
      .update({
        qb_sync_pending: true,
        qb_last_modified: new Date().toISOString(),
      })
      .eq("qb_vendor_id", entityId);
  }
}

/**
 * Handle Estimate entity changes
 */
async function handleEstimateChange(
  db: any,
  connectionId: string,
  entityId: string,
  operation: string
) {
  console.log(`Estimate ${entityId} ${operation} - marking for sync`);
  // Track estimate changes for proposal sync
}
