// const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3710";
const API_URL = process.env.NODE_ENV === "development" ? "http://localhost:3710" : "https://api.moneytracker365.com";


export type AuthUser = {
  id: string;
  name: string;
  email: string;
  userType: "ADMIN" | "CUSTOMER";
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type ApiRequestInit = RequestInit & {
  accessToken?: string | null;
  skipAuthRetry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;
let accessTokenGetter: (() => string | null) | null = null;
let onAccessTokenRefreshed: ((token: string | null) => void) | null = null;

export function registerAccessTokenHandlers(handlers: {
  getAccessToken: () => string | null;
  onAccessTokenRefreshed: (token: string | null) => void;
}): void {
  accessTokenGetter = handlers.getAccessToken;
  onAccessTokenRefreshed = handlers.onAccessTokenRefreshed;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        onAccessTokenRefreshed?.(null);
        return null;
      }

      const data = (await response.json()) as AuthResponse;
      onAccessTokenRefreshed?.(data.accessToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { accessToken, skipAuthRetry, headers, ...rest } = init;

  const requestHeaders = new Headers(headers);

  const token = accessToken ?? accessTokenGetter?.() ?? null;

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (!requestHeaders.has("Content-Type") && rest.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    credentials: "include",
  });

  if (response.status === 401 && token && !skipAuthRetry) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      return apiFetch<T>(path, {
        ...init,
        accessToken: newAccessToken,
        skipAuthRetry: true,
      });
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export async function signupRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
    skipAuthRetry: true,
  });
}

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    skipAuthRetry: true,
  });
}

export async function logoutRequest(accessToken: string | null): Promise<void> {
  await apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    accessToken,
    skipAuthRetry: true,
  });
}

export async function getCurrentUser(
  accessToken: string,
): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/auth/me", {
    method: "GET",
    accessToken,
  });
}

export async function refreshSession(): Promise<AuthResponse | null> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AuthResponse;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryType = "INCOME" | "EXPENSE" | "SAVING" | "INVESTMENT";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export async function createCategory(
  input: { name: string; type: CategoryType },
  accessToken: string,
): Promise<Category> {
  const res = await apiFetch<{ category: Category }>("/categories", {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.category;
}

export async function listCategories(
  accessToken: string,
  type?: CategoryType,
): Promise<Category[]> {
  const params = type ? `?type=${type}` : "";
  const res = await apiFetch<{ categories: Category[] }>(`/categories${params}`, {
    method: "GET",
    accessToken,
  });
  return res.categories;
}

export async function updateCategory(
  id: string,
  input: { name: string },
  accessToken: string,
): Promise<Category> {
  const res = await apiFetch<{ category: Category }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.category;
}

export async function deleteCategory(id: string, accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>(`/categories/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  amount: number;
  note: string | null;
  type: CategoryType;
  date: string;
  categoryId: string;
  category: { id: string; name: string; type: CategoryType };
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListTransactionsResult = {
  transactions: Transaction[];
  pagination: TransactionPagination;
};

export type ListTransactionsParams = {
  month?: string;
  year?: number;
  from?: string;
  to?: string;
  type?: CategoryType;
  categoryId?: string;
  page?: number;
  limit?: number;
};

export async function createTransaction(
  input: { amount: number; note?: string; categoryId: string; date?: string },
  accessToken: string,
): Promise<Transaction> {
  const res = await apiFetch<{ transaction: Transaction }>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.transaction;
}

export async function listTransactions(
  params: ListTransactionsParams,
  accessToken: string,
): Promise<ListTransactionsResult> {
  const qs = new URLSearchParams();
  if (params.month) qs.set("month", params.month);
  if (params.year) qs.set("year", String(params.year));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.type) qs.set("type", params.type);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<ListTransactionsResult>(`/transactions${query}`, {
    method: "GET",
    accessToken,
  });
}

export async function getTransaction(id: string, accessToken: string): Promise<Transaction> {
  const res = await apiFetch<{ transaction: Transaction }>(`/transactions/${id}`, {
    method: "GET",
    accessToken,
  });
  return res.transaction;
}

export async function updateTransaction(
  id: string,
  input: { amount?: number; note?: string | null; categoryId?: string; date?: string },
  accessToken: string,
): Promise<Transaction> {
  const res = await apiFetch<{ transaction: Transaction }>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.transaction;
}

export async function deleteTransaction(id: string, accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>(`/transactions/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

// ─── Debts ────────────────────────────────────────────────────────────────────

export type DebtType = "TAKEN" | "GIVEN";
export type DebtStatus = "ACTIVE" | "SETTLED";

export type Debt = {
  id: string;
  type: DebtType;
  partyName: string;
  amount: number;
  description: string | null;
  date: string;
  status: DebtStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  outstanding: number;
  payments?: DebtPayment[];
};

export type DebtPayment = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
  debtId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type DebtPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListDebtsResult = {
  debts: Debt[];
  pagination: DebtPagination;
};

export type ListDebtsParams = {
  type?: DebtType;
  status?: DebtStatus;
  page?: number;
  limit?: number;
};

export async function createDebt(
  input: { type: DebtType; partyName: string; amount: number; description?: string; date?: string },
  accessToken: string,
): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>("/debts", {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.debt;
}

export async function listDebts(
  params: ListDebtsParams,
  accessToken: string,
): Promise<ListDebtsResult> {
  const qs = new URLSearchParams();
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<ListDebtsResult>(`/debts${query}`, {
    method: "GET",
    accessToken,
  });
}

export async function getDebt(id: string, accessToken: string): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>(`/debts/${id}`, {
    method: "GET",
    accessToken,
  });
  return res.debt;
}

export async function updateDebt(
  id: string,
  input: { type?: DebtType; partyName?: string; amount?: number; description?: string | null; date?: string; status?: DebtStatus },
  accessToken: string,
): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>(`/debts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.debt;
}

export async function deleteDebt(id: string, accessToken: string): Promise<void> {
  await apiFetch<{ message: string }>(`/debts/${id}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function addDebtPayment(
  debtId: string,
  input: { amount: number; date?: string; note?: string },
  accessToken: string,
): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>(`/debts/${debtId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.debt;
}

export async function updateDebtPayment(
  debtId: string,
  paymentId: string,
  input: { amount?: number; date?: string; note?: string | null },
  accessToken: string,
): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>(`/debts/${debtId}/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
    accessToken,
  });
  return res.debt;
}

export async function deleteDebtPayment(
  debtId: string,
  paymentId: string,
  accessToken: string,
): Promise<Debt> {
  const res = await apiFetch<{ debt: Debt }>(`/debts/${debtId}/payments/${paymentId}`, {
    method: "DELETE",
    accessToken,
  });
  return res.debt;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type CategoryBreakdownItem = {
  id: string;
  name: string;
  type: CategoryType;
  total: number;
  percentage: number;
};

export type DailyTotalItem = {
  date: string;
  income: number;
  expense: number;
  saving: number;
  investment: number;
};

export type MonthlyReport = {
  month: string;
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  totalInvestment: number;
  netBalance: number;
  categoryBreakdown: CategoryBreakdownItem[];
  dailyTotals: DailyTotalItem[];
};

export async function getMonthlyReport(month: string, accessToken: string): Promise<MonthlyReport> {
  const res = await apiFetch<{ report: MonthlyReport }>(`/reports/monthly?month=${month}`, {
    method: "GET",
    accessToken,
  });
  return res.report;
}

export type MonthlyTotalItem = {
  month: string;
  income: number;
  expense: number;
  saving: number;
  investment: number;
};

export type AnnualReport = {
  year: number;
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  totalInvestment: number;
  netBalance: number;
  categoryBreakdown: CategoryBreakdownItem[];
  monthlyTotals: MonthlyTotalItem[];
};

export async function getAnnualReport(year: number, accessToken: string): Promise<AnnualReport> {
  const res = await apiFetch<{ report: AnnualReport }>(`/reports/annual?year=${year}`, {
    method: "GET",
    accessToken,
  });
  return res.report;
}
