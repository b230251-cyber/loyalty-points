import { Member, MenuItem, RewardItem, ProgramConfig, CheckoutResult, LoyaltyTransaction, ReconciliationData } from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; memberCount: number }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function searchMembers(query: string, limit = 15): Promise<Member[]> {
  const res = await fetch(`${API_BASE}/members/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to search members');
  const data = await res.json();
  return data.members || [];
}

export async function getMemberById(id: string): Promise<Member> {
  const res = await fetch(`${API_BASE}/members/${id}`);
  if (!res.ok) throw new Error('Member not found');
  const data = await res.json();
  return data.member;
}

export async function registerMember(payload: { phoneNumber: string; name: string; email?: string; initialPoints?: number }): Promise<Member> {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to register member');
  return data.member;
}

export async function getMemberTransactions(memberId: string): Promise<LoyaltyTransaction[]> {
  const res = await fetch(`${API_BASE}/members/${memberId}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  return data.transactions || [];
}

export async function getMemberReconciliation(memberId: string): Promise<ReconciliationData> {
  const res = await fetch(`${API_BASE}/members/${memberId}/reconciliation`);
  if (!res.ok) throw new Error('Failed to reconcile member balance');
  const data = await res.json();
  return data.reconciliation;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const res = await fetch(`${API_BASE}/catalog/menu`);
  if (!res.ok) throw new Error('Failed to fetch menu items');
  const data = await res.json();
  return data.items || [];
}

export async function fetchRewardItems(): Promise<RewardItem[]> {
  const res = await fetch(`${API_BASE}/catalog/rewards`);
  if (!res.ok) throw new Error('Failed to fetch reward items');
  const data = await res.json();
  return data.rewards || [];
}

export async function fetchConfig(): Promise<ProgramConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch program config');
  const data = await res.json();
  return data.config;
}

export async function updateConfig(config: Partial<ProgramConfig>): Promise<ProgramConfig> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update config');
  return data.config;
}

export async function processCheckout(payload: {
  memberId?: string;
  items: Array<{ menuItemId: string; name: string; price: number; quantity: number; isRedemption?: boolean; pointsCost?: number }>;
  paymentMethod: 'CASH' | 'CARD';
}): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout failed');
  return data.result;
}

export async function fetchRecentOrders(limit = 20): Promise<any[]> {
  const res = await fetch(`${API_BASE}/orders/recent?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent orders');
  const data = await res.json();
  return data.orders || [];
}
