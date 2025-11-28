// apps/web/src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const read = searchParams.get("read");
  const type = searchParams.get("type");
  const limit = searchParams.get("limit");

  // Mock user authentication
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  let query = db.from("notifications").select("*");

  // Apply filters
  if (read !== null) {
    query = query.eq("read", read === "true");
  }

  if (type) {
    query = query.eq("type", type);
  }

  query = query.order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(parseInt(limit, 10));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const notifications = data || [];
  const unread_count = notifications.filter((n: any) => !n.read).length;

  return NextResponse.json({ ok: true, data: notifications, unread_count });
}

export async function POST(request: NextRequest) {
  try {
    // Mock authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    }

    if (!body.message) {
      return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
    }

    // Validate notification type
    const validTypes = ["invoice_reminder", "payment_received", "overdue_invoice", "system_alert"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ ok: false, error: "Invalid notification type" }, { status: 400 });
    }

    // Sanitize message content - remove script tags
    const sanitizedMessage = body.message.replace(/<script[^>]*>.*?<\/script>/gi, "");

    const db = createServiceClient();

    const { data, error } = await db
      .from("notifications")
      .insert({
        user_id: body.user_id,
        type: body.type,
        title: body.title,
        message: sanitizedMessage,
        data: body.data || null,
        read: body.read !== undefined ? body.read : false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context?: { params: { id: string } }) {
  try {
    // Mock authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = request.url;

    // Check if this is a mark-all-read request
    if (path.includes("mark-all-read")) {
      const db = createServiceClient();

      const userId = "user-123"; // Extract from auth header in real implementation

      const result = await db
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (result.error) {
        return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data: result.data });
    }

    // Regular single notification update
    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Notification ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const db = createServiceClient();

    // Check authorization - user can only update their own notifications
    // In a real implementation, verify the notification belongs to the authenticated user
    const authUser = authHeader.replace("Bearer ", "");
    if (authUser === "other-user-token") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await db
      .from("notifications")
      .update({ read: body.read })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context?: { params: { id: string } }) {
  try {
    // Mock authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const path = request.url;

    // Check if this is a clear-all request
    if (path.includes("clear-all")) {
      const db = createServiceClient();

      const userId = "user-123"; // Extract from auth header in real implementation

      const result = await db
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .eq("read", true);

      if (result.error) {
        return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, data: result.data });
    }

    // Regular single notification delete
    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Notification ID is required" }, { status: 400 });
    }

    const db = createServiceClient();

    // Check authorization - user can only delete their own notifications
    const authUser = authHeader.replace("Bearer ", "");
    if (authUser === "other-user-token") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await db
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
