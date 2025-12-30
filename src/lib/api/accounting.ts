import { supabase } from '@/integrations/supabase/client';
import type { ChartOfAccount, JournalEntry, JournalLine, TrialBalanceRow } from '@/types';

// ============================================
// CHART OF ACCOUNTS API
// ============================================

export async function getChartOfAccounts() {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('is_active', true)
    .order('code');

  if (error) throw error;
  return data;
}

export async function getAccount(id: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAccount(account: Omit<ChartOfAccount, 'id'>) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// JOURNAL ENTRIES API
// ============================================

export async function getJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  referenceType?: string;
}) {
  let query = supabase
    .from('journal_entries')
    .select(`
      *,
      journal_lines(
        *,
        chart_of_accounts(code, name, account_type)
      )
    `)
    .order('entry_date', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('entry_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('entry_date', filters.endDate);
  }
  if (filters?.referenceType) {
    query = query.eq('reference_type', filters.referenceType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getJournalEntry(id: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      *,
      journal_lines(
        *,
        chart_of_accounts(code, name, account_type)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createJournalEntry(entry: {
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  lines: Array<{
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}) {
  // Validate balanced entry
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Journal entry must be balanced (debit = credit)');
  }

  // Create entry
  const { data: journalEntry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      entry_date: entry.entry_date,
      description: entry.description,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      total_debit: totalDebit,
      total_credit: totalCredit,
    })
    .select()
    .single();

  if (entryError) throw entryError;

  // Create lines
  const lines = entry.lines.map(line => ({
    entry_id: journalEntry.id,
    ...line,
  }));

  const { error: linesError } = await supabase
    .from('journal_lines')
    .insert(lines);

  if (linesError) throw linesError;

  return journalEntry;
}

// ============================================
// TRIAL BALANCE API
// ============================================

export async function getTrialBalance(startDate?: string, endDate?: string): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase.rpc('get_trial_balance', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return data || [];
}

// ============================================
// FINANCIAL STATEMENTS
// ============================================

export async function getIncomeStatement(startDate: string, endDate: string) {
  const trialBalance = await getTrialBalance(startDate, endDate);

  const revenue = trialBalance
    .filter(row => row.account_type === 'revenue')
    .reduce((sum, row) => sum + row.balance, 0);

  const expenses = trialBalance
    .filter(row => row.account_type === 'expense')
    .reduce((sum, row) => sum + row.balance, 0);

  const netIncome = revenue - expenses;

  return {
    period: { startDate, endDate },
    revenue: trialBalance.filter(row => row.account_type === 'revenue'),
    expenses: trialBalance.filter(row => row.account_type === 'expense'),
    totals: {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netIncome,
    },
  };
}

export async function getBalanceSheet(asOfDate: string) {
  const trialBalance = await getTrialBalance(undefined, asOfDate);

  const assets = trialBalance.filter(row => row.account_type === 'asset');
  const liabilities = trialBalance.filter(row => row.account_type === 'liability');
  const equity = trialBalance.filter(row => row.account_type === 'equity');

  const totalAssets = assets.reduce((sum, row) => sum + row.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, row) => sum + row.balance, 0);
  const totalEquity = equity.reduce((sum, row) => sum + row.balance, 0);

  return {
    asOfDate,
    assets,
    liabilities,
    equity,
    totals: {
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
    },
  };
}

// ============================================
// ACCOUNTING PERIODS API
// ============================================

export interface AccountingPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAccountingPeriods(year?: number): Promise<AccountingPeriod[]> {
  let query = supabase
    .from('accounting_periods')
    .select('*')
    .order('start_date', { ascending: false });

  if (year) {
    query = query
      .gte('start_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AccountingPeriod[];
}

export async function createAccountingPeriod(period: {
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
}): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .insert(period)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}

export async function closeAccountingPeriod(periodId: string): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}

export async function reopenAccountingPeriod(periodId: string, password: string): Promise<AccountingPeriod> {
  // Verify admin password
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'admin_password')
    .single();

  if (settingsError) throw new Error('Gagal verifikasi password');
  
  if (settings.setting_value !== password) {
    throw new Error('Password admin salah');
  }

  // Reopen the period
  const { data, error } = await supabase
    .from('accounting_periods')
    .update({
      status: 'open',
      closed_at: null,
      notes: `Dibuka kembali pada ${new Date().toLocaleString('id-ID')}`,
    })
    .eq('id', periodId)
    .select()
    .single();

  if (error) throw error;
  return data as AccountingPeriod;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'admin_password')
    .single();

  if (error) return false;
  return data.setting_value === password;
}

export async function updateAdminPassword(oldPassword: string, newPassword: string): Promise<void> {
  // Verify old password first
  const isValid = await verifyAdminPassword(oldPassword);
  if (!isValid) {
    throw new Error('Password lama salah');
  }

  const { error } = await supabase
    .from('app_settings')
    .update({ setting_value: newPassword })
    .eq('setting_key', 'admin_password');

  if (error) throw error;
}
