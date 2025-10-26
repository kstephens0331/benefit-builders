// QuickBooks Online Integration
// Sync invoices, customers, and payments with QuickBooks

import QuickBooks from "node-quickbooks";

// QuickBooks OAuth configuration
const QB_CLIENT_ID = process.env.QB_CLIENT_ID || "";
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET || "";
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI || "";
const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || "sandbox"; // 'sandbox' or 'production'

// Store QuickBooks tokens in database (fetch these from company_integrations table)
interface QBTokens {
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
  return new Promise((resolve, reject) => {
    QuickBooks.refreshAccessToken(
      tokens.refreshToken,
      QB_CLIENT_ID,
      QB_CLIENT_SECRET,
      (err: any, result: any) => {
        if (err) {
          console.error("QuickBooks token refresh error:", err);
          reject(err);
          return;
        }

        const expiresIn = result.expires_in || 3600;
        const refreshExpiresIn = result.x_refresh_token_expires_in || 8726400;

        const newTokens: QBTokens = {
          realmId: tokens.realmId,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          accessTokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
          refreshTokenExpiry: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
        };

        resolve(newTokens);
      }
    );
  });
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
 * Generate OAuth URL for user authorization
 */
export function getQBAuthUrl(): string {
  return QuickBooks.authorizeUrl(QB_CLIENT_ID, QB_REDIRECT_URI, "offline_access openid profile email phone address");
}

/**
 * Exchange authorization code for tokens
 */
export async function getQBTokensFromCode(
  authCode: string,
  realmId: string
): Promise<QBTokens | null> {
  return new Promise((resolve, reject) => {
    QuickBooks.createToken(
      QB_CLIENT_ID,
      QB_CLIENT_SECRET,
      authCode,
      QB_REDIRECT_URI,
      (err: any, result: any) => {
        if (err) {
          console.error("QuickBooks token creation error:", err);
          reject(err);
          return;
        }

        const expiresIn = result.expires_in || 3600;
        const refreshExpiresIn = result.x_refresh_token_expires_in || 8726400;

        const tokens: QBTokens = {
          realmId,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
          accessTokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
          refreshTokenExpiry: new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
        };

        resolve(tokens);
      }
    );
  });
}
