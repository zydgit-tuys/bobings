import { supabase } from "@/integrations/supabase/client";

export interface BankAccount {
  id: string;
  account_id: string;
  bank_name: string;
  account_number: string | null;
  account_holder: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  chart_of_accounts?: {
    id: string;
    code: string;
    name: string;
  };
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(`
      *,
      chart_of_accounts:account_id (id, code, name)
    `)
    .order('is_default', { ascending: false })
    .order('bank_name');

  if (error) throw error;
  return (data as unknown as BankAccount[]) || [];
}

export async function getBankAccount(id: string): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select(`
      *,
      chart_of_accounts:account_id (id, code, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as BankAccount;
}

export async function createBankAccount(bankAccount: {
  account_id: string;
  bank_name: string;
  account_number?: string;
  account_holder?: string;
  is_default?: boolean;
}): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert(bankAccount)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as BankAccount;
}

export async function updateBankAccount(
  id: string,
  bankAccount: Partial<{
    account_id: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
    is_default: boolean;
    is_active: boolean;
  }>
): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update(bankAccount)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as BankAccount;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setDefaultBankAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .update({ is_default: true })
    .eq('id', id);

  if (error) throw error;
}
