import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | string;
  paidAt: string | null;
  settlementMode: string | null;
  dueDate: string | null;
  total: number;
  createdAt: string;
  customer?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  items?: {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * GET /admin/invoices — paginated list (0-based page)
 */
export const getInvoices = async (page = 0, limit = 20, status?: string) => {
  const response = await api.get("admin/invoices", {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return response.data;
};

/**
 * GET /admin/invoices/:id — single invoice
 */
export const getInvoice = async (id: string | number) => {
  const response = await api.get(`admin/invoices/${id}`);
  return response.data;
};

/**
 * POST /admin/invoices/:id/reopen-paid
 * Returns updated invoice with status, settlementMode: null, paidAt: null
 */
export const reopenPaidInvoice = async (id: string | number, reason: string) => {
  const response = await api.post(`admin/invoices/${id}/reopen-paid`, { reason });
  return response.data;
};
