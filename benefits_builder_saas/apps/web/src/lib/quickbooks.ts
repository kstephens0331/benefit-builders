// QuickBooks Online Integration
// Sync invoices, customers, and payments with QuickBooks

import QuickBooks from "node-quickbooks";

// QuickBooks OAuth configuration
const QB_CLIENT_ID = process.env.QB_CLIENT_ID || "";
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET || "";
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI || "";
const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || "sandbox"; // 'sandbox' or 'production'

// Store QuickBooks tokens in database (fetch these from company_integrations table)
export interface QBTokens {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

/**
 * Get QuickBooks client instance
 */
function getQBClient(tokens: QBTokens): any {
  const qbo = new QuickBooks(
    QB_CLIENT_ID,
    QB_CLIENT_SECRET,
    tokens.accessToken,
    false, // no token secret needed for OAuth 2.0
    tokens.realmId,
    QB_ENVIRONMENT === "sandbox", // use sandbox
    true, // enable debugging
    null, // minor version
    "2.0", // OAuth version
    tokens.refreshToken
  );

  return qbo;
}

/**
 * Refresh access token if expired
 */
export async function refreshQBToken(tokens: QBTokens): Promise<QBTokens | null> {
  // QuickBooks OAuth 2.0 token endpoint
  const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

  // Create Basic auth header
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("QuickBooks token refresh failed:", response.status, errorText);
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const expiresIn = result.expires_in || 3600;
  const refreshExpiresIn = result.x_refresh_token_expires_in || 8726400;

  const newTokens: QBTokens = {
    realmId: tokens.realmId,
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    accessTokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshTokenExpiry: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
  };

  return newTokens;
}

/**
 * Check if token is expired and refresh if needed
 */
export async function ensureValidToken(tokens: QBTokens): Promise<QBTokens> {
  const now = new Date();
  const expiry = new Date(tokens.accessTokenExpiry);

  // Refresh if token expires in less than 5 minutes
  if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    const newTokens = await refreshQBToken(tokens);
    if (!newTokens) {
      throw new Error("Failed to refresh QuickBooks token");
    }
    return newTokens;
  }

  return tokens;
}

/**
 * Create or update customer in QuickBooks
 */
export async function syncCustomerToQB(
  tokens: QBTokens,
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    qb_customer_id?: string;
  }
): Promise<{ success: boolean; qb_customer_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    if (customer.qb_customer_id) {
      // Update existing customer
      return new Promise((resolve) => {
        qbo.getCustomer(customer.qb_customer_id, (err: any, existingCustomer: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          const updatedCustomer = {
            ...existingCustomer,
            DisplayName: customer.name,
            PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
            PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
            SyncToken: existingCustomer.SyncToken
          };

          qbo.updateCustomer(updatedCustomer, (updateErr: any, result: any) => {
            if (updateErr) {
              resolve({ success: false, error: updateErr.message });
              return;
            }

            resolve({ success: true, qb_customer_id: result.Id });
          });
        });
      });
    } else {
      // Create new customer
      return new Promise((resolve) => {
        const newCustomer = {
          DisplayName: customer.name,
          PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
          PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined
        };

        qbo.createCustomer(newCustomer, (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, qb_customer_id: result.Id });
        });
      });
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create invoice in QuickBooks
 */
export async function createInvoiceInQB(
  tokens: QBTokens,
  invoice: {
    customer_qb_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    line_items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    subtotal: number;
    tax_rate?: number;
    tax_amount: number;
    total: number;
  }
): Promise<{ success: boolean; qb_invoice_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbInvoice = {
        CustomerRef: {
          value: invoice.customer_qb_id
        },
        DocNumber: invoice.invoice_number,
        TxnDate: invoice.invoice_date,
        DueDate: invoice.due_date,
        Line: invoice.line_items.map((item) => ({
          DetailType: "SalesItemLineDetail",
          Description: item.description,
          Amount: item.amount / 100, // Convert cents to dollars
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.rate / 100
          }
        })),
        TxnTaxDetail: invoice.tax_amount > 0 ? {
          TotalTax: invoice.tax_amount / 100
        } : undefined
      };

      qbo.createInvoice(qbInvoice, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_invoice_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get invoice from QuickBooks
 */
export async function getInvoiceFromQB(
  tokens: QBTokens,
  qb_invoice_id: string
): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.getInvoice(qb_invoice_id, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, invoice: result });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Record payment in QuickBooks
 */
export async function recordPaymentInQB(
  tokens: QBTokens,
  payment: {
    customer_qb_id: string;
    invoice_qb_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string;
  }
): Promise<{ success: boolean; qb_payment_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbPayment = {
        CustomerRef: {
          value: payment.customer_qb_id
        },
        TotalAmt: payment.amount / 100, // Convert cents to dollars
        TxnDate: payment.payment_date,
        PaymentMethodRef: {
          value: payment.payment_method
        },
        PrivateNote: payment.reference_number,
        Line: [
          {
            Amount: payment.amount / 100,
            LinkedTxn: [
              {
                TxnId: payment.invoice_qb_id,
                TxnType: "Invoice"
              }
            ]
          }
        ]
      };

      qbo.createPayment(qbPayment, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_payment_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get QuickBooks company info
 */
export async function getQBCompanyInfo(
  tokens: QBTokens
): Promise<{ success: boolean; company?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.getCompanyInfo(tokens.realmId, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, company: result });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all customers from QuickBooks using direct API call
 */
export async function getAllCustomersFromQB(
  tokens: QBTokens
): Promise<{ success: boolean; customers?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    const query = "SELECT * FROM Customer MAXRESULTS 1000";

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, customers: result.QueryResponse?.Customer || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all invoices from QuickBooks using direct API call
 */
export async function getAllInvoicesFromQB(
  tokens: QBTokens,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    let query = "SELECT * FROM Invoice";
    if (startDate && endDate) {
      query += ` WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    }
    query += " MAXRESULTS 1000";

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, invoices: result.QueryResponse?.Invoice || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all payments from QuickBooks using direct API call
 */
export async function getAllPaymentsFromQB(
  tokens: QBTokens,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; payments?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    let query = "SELECT * FROM Payment";
    if (startDate && endDate) {
      query += ` WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    }
    query += " MAXRESULTS 1000";

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, payments: result.QueryResponse?.Payment || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Search customers in QuickBooks by name using direct API call
 */
export async function searchCustomersInQB(
  tokens: QBTokens,
  searchTerm: string
): Promise<{ success: boolean; customers?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    const query = `SELECT * FROM Customer WHERE DisplayName LIKE '%${searchTerm}%' MAXRESULTS 100`;

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, customers: result.QueryResponse?.Customer || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate OAuth URL for user authorization
 */
export function getQBAuthUrl(): string {
  // QuickBooks OAuth 2.0 authorization endpoint
  const authBaseUrl = "https://appcenter.intuit.com/connect/oauth2";

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  // Build the authorization URL manually (node-quickbooks doesn't expose a static authorizeUrl method)
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    redirect_uri: QB_REDIRECT_URI,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting openid profile email phone address",
    state: state,
  });

  return `${authBaseUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function getQBTokensFromCode(
  authCode: string,
  realmId: string
): Promise<QBTokens | null> {
  // QuickBooks OAuth 2.0 token endpoint
  const tokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

  // Create Basic auth header
  const credentials = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: QB_REDIRECT_URI,
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("QuickBooks token exchange failed:", response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const expiresIn = result.expires_in || 3600;
  const refreshExpiresIn = result.x_refresh_token_expires_in || 8726400;

  const tokens: QBTokens = {
    realmId,
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    accessTokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshTokenExpiry: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
  };

  return tokens;
}

// =====================================================
// VENDOR & BILL MANAGEMENT (A/P Side)
// =====================================================

/**
 * Create or update vendor in QuickBooks
 */
export async function syncVendorToQB(
  tokens: QBTokens,
  vendor: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    qb_vendor_id?: string;
  }
): Promise<{ success: boolean; qb_vendor_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    if (vendor.qb_vendor_id) {
      // Update existing vendor
      return new Promise((resolve) => {
        qbo.getVendor(vendor.qb_vendor_id, (err: any, existingVendor: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          const updatedVendor = {
            ...existingVendor,
            DisplayName: vendor.name,
            PrimaryEmailAddr: vendor.email ? { Address: vendor.email } : undefined,
            PrimaryPhone: vendor.phone ? { FreeFormNumber: vendor.phone } : undefined,
            SyncToken: existingVendor.SyncToken
          };

          qbo.updateVendor(updatedVendor, (updateErr: any, result: any) => {
            if (updateErr) {
              resolve({ success: false, error: updateErr.message });
              return;
            }

            resolve({ success: true, qb_vendor_id: result.Id });
          });
        });
      });
    } else {
      // Create new vendor
      return new Promise((resolve) => {
        const newVendor = {
          DisplayName: vendor.name,
          PrimaryEmailAddr: vendor.email ? { Address: vendor.email } : undefined,
          PrimaryPhone: vendor.phone ? { FreeFormNumber: vendor.phone } : undefined
        };

        qbo.createVendor(newVendor, (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, qb_vendor_id: result.Id });
        });
      });
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all vendors from QuickBooks
 */
export async function getAllVendorsFromQB(
  tokens: QBTokens
): Promise<{ success: boolean; vendors?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.findVendors(
        { fetchAll: true },
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, vendors: result.QueryResponse?.Vendor || [] });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create bill in QuickBooks
 */
export async function createBillInQB(
  tokens: QBTokens,
  bill: {
    vendor_qb_id: string;
    bill_number?: string;
    bill_date: string;
    due_date: string;
    line_items: Array<{
      description: string;
      amount: number;
      account_ref?: string; // QuickBooks account ID for expense tracking
    }>;
    total: number;
  }
): Promise<{ success: boolean; qb_bill_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbBill = {
        VendorRef: {
          value: bill.vendor_qb_id
        },
        DocNumber: bill.bill_number,
        TxnDate: bill.bill_date,
        DueDate: bill.due_date,
        Line: bill.line_items.map((item) => ({
          DetailType: "AccountBasedExpenseLineDetail",
          Description: item.description,
          Amount: item.amount / 100, // Convert cents to dollars
          AccountBasedExpenseLineDetail: {
            AccountRef: item.account_ref ? { value: item.account_ref } : undefined
          }
        }))
      };

      qbo.createBill(qbBill, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_bill_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all bills from QuickBooks
 */
export async function getAllBillsFromQB(
  tokens: QBTokens,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; bills?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    let query = "SELECT * FROM Bill";
    if (startDate && endDate) {
      query += ` WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    }
    query += " MAXRESULTS 1000";

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, bills: result.QueryResponse?.Bill || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pay bill in QuickBooks (BillPayment)
 */
export async function payBillInQB(
  tokens: QBTokens,
  payment: {
    vendor_qb_id: string;
    bill_qb_id: string;
    amount: number;
    payment_date: string;
    payment_account_ref: string; // Bank account paying from
    payment_method?: string;
  }
): Promise<{ success: boolean; qb_payment_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbBillPayment = {
        VendorRef: {
          value: payment.vendor_qb_id
        },
        TotalAmt: payment.amount / 100,
        TxnDate: payment.payment_date,
        APAccountRef: {
          value: payment.payment_account_ref
        },
        PayType: payment.payment_method || "Check",
        Line: [
          {
            Amount: payment.amount / 100,
            LinkedTxn: [
              {
                TxnId: payment.bill_qb_id,
                TxnType: "Bill"
              }
            ]
          }
        ]
      };

      qbo.createBillPayment(qbBillPayment, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_payment_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// CREDIT MEMOS & REFUNDS
// =====================================================

/**
 * Create credit memo in QuickBooks
 */
export async function createCreditMemoInQB(
  tokens: QBTokens,
  creditMemo: {
    customer_qb_id: string;
    credit_memo_date: string;
    line_items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    total: number;
    reason?: string;
  }
): Promise<{ success: boolean; qb_credit_memo_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbCreditMemo = {
        CustomerRef: {
          value: creditMemo.customer_qb_id
        },
        TxnDate: creditMemo.credit_memo_date,
        PrivateNote: creditMemo.reason,
        Line: creditMemo.line_items.map((item) => ({
          DetailType: "SalesItemLineDetail",
          Description: item.description,
          Amount: item.amount / 100,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.rate / 100
          }
        }))
      };

      qbo.createCreditMemo(qbCreditMemo, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_credit_memo_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create refund receipt in QuickBooks
 */
export async function createRefundReceiptInQB(
  tokens: QBTokens,
  refund: {
    customer_qb_id: string;
    refund_date: string;
    payment_method: string;
    line_items: Array<{
      description: string;
      amount: number;
    }>;
    total: number;
  }
): Promise<{ success: boolean; qb_refund_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbRefund = {
        CustomerRef: {
          value: refund.customer_qb_id
        },
        TxnDate: refund.refund_date,
        PaymentMethodRef: {
          value: refund.payment_method
        },
        Line: refund.line_items.map((item) => ({
          DetailType: "SalesItemLineDetail",
          Description: item.description,
          Amount: item.amount / 100,
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: item.amount / 100
          }
        }))
      };

      qbo.createRefundReceipt(qbRefund, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_refund_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// ESTIMATES (QUOTES/PROPOSALS)
// =====================================================

/**
 * Create estimate in QuickBooks
 */
export async function createEstimateInQB(
  tokens: QBTokens,
  estimate: {
    customer_qb_id: string;
    estimate_date: string;
    expiration_date?: string;
    line_items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    total: number;
    customer_memo?: string;
  }
): Promise<{ success: boolean; qb_estimate_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbEstimate = {
        CustomerRef: {
          value: estimate.customer_qb_id
        },
        TxnDate: estimate.estimate_date,
        ExpirationDate: estimate.expiration_date,
        CustomerMemo: estimate.customer_memo ? { value: estimate.customer_memo } : undefined,
        Line: estimate.line_items.map((item) => ({
          DetailType: "SalesItemLineDetail",
          Description: item.description,
          Amount: item.amount / 100,
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.rate / 100
          }
        }))
      };

      qbo.createEstimate(qbEstimate, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_estimate_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all estimates from QuickBooks using direct API call
 */
export async function getAllEstimatesFromQB(
  tokens: QBTokens,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; estimates?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);

    let query = "SELECT * FROM Estimate";
    if (startDate && endDate) {
      query += ` WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
    }
    query += " MAXRESULTS 1000";

    const baseUrl = QB_ENVIRONMENT === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";

    const response = await fetch(
      `${baseUrl}/v3/company/${validTokens.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${validTokens.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();
    return { success: true, estimates: result.QueryResponse?.Estimate || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// ITEMS/PRODUCTS MANAGEMENT
// =====================================================

/**
 * Create service item in QuickBooks
 */
export async function createServiceItemInQB(
  tokens: QBTokens,
  item: {
    name: string;
    description?: string;
    rate: number;
    income_account_ref?: string;
  }
): Promise<{ success: boolean; qb_item_id?: string; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const qbItem = {
        Name: item.name,
        Type: "Service",
        Description: item.description,
        UnitPrice: item.rate / 100,
        IncomeAccountRef: item.income_account_ref ? { value: item.income_account_ref } : undefined
      };

      qbo.createItem(qbItem, (err: any, result: any) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }

        resolve({ success: true, qb_item_id: result.Id });
      });
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all items from QuickBooks
 */
export async function getAllItemsFromQB(
  tokens: QBTokens
): Promise<{ success: boolean; items?: any[]; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.findItems(
        { fetchAll: true },
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, items: result.QueryResponse?.Item || [] });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// REPORTS
// =====================================================

/**
 * Get Profit & Loss report from QuickBooks
 */
export async function getProfitAndLossReport(
  tokens: QBTokens,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.reportProfitAndLoss(
        { start_date: startDate, end_date: endDate },
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, report: result });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Balance Sheet report from QuickBooks
 */
export async function getBalanceSheetReport(
  tokens: QBTokens,
  asOfDate: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.reportBalanceSheet(
        { date: asOfDate },
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, report: result });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get Cash Flow report from QuickBooks
 */
export async function getCashFlowReport(
  tokens: QBTokens,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      qbo.reportCashFlow(
        { start_date: startDate, end_date: endDate },
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, report: result });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get A/R Aging report from QuickBooks
 */
export async function getARAgingReport(
  tokens: QBTokens,
  asOfDate?: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const params = asOfDate ? { report_date: asOfDate } : {};

      qbo.reportAgedReceivables(
        params,
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, report: result });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get A/P Aging report from QuickBooks
 */
export async function getAPAgingReport(
  tokens: QBTokens,
  asOfDate?: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const validTokens = await ensureValidToken(tokens);
    const qbo = getQBClient(validTokens);

    return new Promise((resolve) => {
      const params = asOfDate ? { report_date: asOfDate } : {};

      qbo.reportAgedPayables(
        params,
        (err: any, result: any) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }

          resolve({ success: true, report: result });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Batch create/update entities with error handling
 */
export async function batchOperation<T>(
  operations: Array<() => Promise<T>>,
  options?: {
    maxConcurrent?: number;
    retryAttempts?: number;
    retryDelay?: number;
  }
): Promise<{ results: T[]; errors: any[] }> {
  const maxConcurrent = options?.maxConcurrent || 5;
  const retryAttempts = options?.retryAttempts || 3;
  const retryDelay = options?.retryDelay || 1000;

  const results: T[] = [];
  const errors: any[] = [];

  // Execute operations in batches
  for (let i = 0; i < operations.length; i += maxConcurrent) {
    const batch = operations.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map(async (operation) => {
        // Retry logic with exponential backoff
        for (let attempt = 0; attempt <= retryAttempts; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === retryAttempts) {
              throw error;
            }
            // Exponential backoff: 1s, 2s, 4s, etc.
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          }
        }
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value as T);
      } else {
        errors.push(result.reason);
      }
    });
  }

  return { results, errors };
}

// =====================================================
// ERROR HANDLING UTILITIES
// =====================================================

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts || 3;
  const initialDelay = options?.initialDelay || 1000;
  const maxDelay = options?.maxDelay || 10000;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable (e.g., rate limit, network error)
      if (!isRetryableError(error) || attempt === maxAttempts - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors
  if (error.code === 429 || error.message?.includes('rate limit')) {
    return true;
  }

  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Temporary QB errors
  if (error.code >= 500 && error.code < 600) {
    return true;
  }

  return false;
}

/**
 * Check for duplicate entities before creating
 */
export async function findDuplicateCustomer(
  tokens: QBTokens,
  name: string,
  email?: string
): Promise<{ exists: boolean; qb_customer_id?: string }> {
  try {
    const searchResult = await searchCustomersInQB(tokens, name);

    if (!searchResult.success || !searchResult.customers) {
      return { exists: false };
    }

    // Check for exact name match or email match
    const duplicate = searchResult.customers.find((customer: any) => {
      const nameMatch = customer.DisplayName === name;
      const emailMatch = email && customer.PrimaryEmailAddr?.Address === email;
      return nameMatch || emailMatch;
    });

    return {
      exists: !!duplicate,
      qb_customer_id: duplicate?.Id
    };
  } catch (error) {
    console.error('Error checking for duplicate customer:', error);
    return { exists: false };
  }
}
