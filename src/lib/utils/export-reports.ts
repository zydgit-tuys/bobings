import { getTrialBalance, getIncomeStatement, getBalanceSheet, getJournalEntries } from '@/lib/api/accounting';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ExportData {
  trialBalance: any[];
  incomeStatement: any;
  balanceSheet: any;
  journalEntries: any[];
}

async function fetchAllReports(startDate: string, endDate: string): Promise<ExportData> {
  const [trialBalance, incomeStatement, balanceSheet, journalEntries] = await Promise.all([
    getTrialBalance(startDate, endDate),
    getIncomeStatement(startDate, endDate),
    getBalanceSheet(endDate),
    getJournalEntries({ startDate, endDate }),
  ]);

  return {
    trialBalance,
    incomeStatement,
    balanceSheet,
    journalEntries,
  };
}

function formatCurrency(value: number): string {
  return `Rp ${Math.abs(value).toLocaleString('id-ID')}`;
}

function generateTrialBalanceCSV(data: any[]): string {
  let csv = 'Kode Akun,Nama Akun,Tipe,Total Debit,Total Kredit,Saldo\n';
  
  data.forEach(row => {
    csv += `"${row.account_code}","${row.account_name}","${row.account_type}",${row.total_debit},${row.total_credit},${row.balance}\n`;
  });
  
  return csv;
}

function generateIncomeStatementCSV(data: any): string {
  let csv = 'Laporan Laba Rugi\n';
  csv += `Periode: ${data.period.startDate} - ${data.period.endDate}\n\n`;
  
  csv += 'PENDAPATAN\n';
  csv += 'Kode,Nama,Nilai\n';
  data.revenue.forEach((row: any) => {
    csv += `"${row.account_code}","${row.account_name}",${Math.abs(row.balance)}\n`;
  });
  csv += `,,${Math.abs(data.totals.totalRevenue)}\n\n`;
  
  csv += 'BEBAN\n';
  csv += 'Kode,Nama,Nilai\n';
  data.expenses.forEach((row: any) => {
    csv += `"${row.account_code}","${row.account_name}",${row.balance}\n`;
  });
  csv += `,,${data.totals.totalExpenses}\n\n`;
  
  csv += `LABA/RUGI BERSIH,,${data.totals.netIncome}\n`;
  
  return csv;
}

function generateBalanceSheetCSV(data: any): string {
  let csv = 'Neraca (Balance Sheet)\n';
  csv += `Per Tanggal: ${data.asOfDate}\n\n`;
  
  csv += 'AKTIVA (ASSETS)\n';
  csv += 'Kode,Nama,Nilai\n';
  data.assets.forEach((row: any) => {
    csv += `"${row.account_code}","${row.account_name}",${row.balance}\n`;
  });
  csv += `Total Aktiva,,${data.totals.totalAssets}\n\n`;
  
  csv += 'KEWAJIBAN (LIABILITIES)\n';
  csv += 'Kode,Nama,Nilai\n';
  data.liabilities.forEach((row: any) => {
    csv += `"${row.account_code}","${row.account_name}",${Math.abs(row.balance)}\n`;
  });
  csv += `Total Kewajiban,,${Math.abs(data.totals.totalLiabilities)}\n\n`;
  
  csv += 'EKUITAS (EQUITY)\n';
  csv += 'Kode,Nama,Nilai\n';
  data.equity.forEach((row: any) => {
    csv += `"${row.account_code}","${row.account_name}",${Math.abs(row.balance)}\n`;
  });
  csv += `Total Ekuitas,,${Math.abs(data.totals.totalEquity)}\n\n`;
  
  csv += `Total Pasiva,,${Math.abs(data.totals.liabilitiesAndEquity)}\n`;
  
  return csv;
}

function generateJournalEntriesCSV(data: any[]): string {
  let csv = 'Jurnal Umum\n\n';
  csv += 'Tanggal,Deskripsi,Ref Type,Kode Akun,Nama Akun,Debit,Kredit\n';
  
  data.forEach(entry => {
    entry.journal_lines?.forEach((line: any, index: number) => {
      const account = line.chart_of_accounts;
      csv += `"${index === 0 ? entry.entry_date : ''}","${index === 0 ? entry.description : ''}","${index === 0 ? (entry.reference_type || '') : ''}","${account?.code || ''}","${account?.name || ''}",${line.debit},${line.credit}\n`;
    });
    csv += '\n';
  });
  
  return csv;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportAllReports(startDate: string, endDate: string, periodName: string) {
  const data = await fetchAllReports(startDate, endDate);
  const safeFileName = periodName.replace(/\s+/g, '_');
  
  // Export each report
  downloadFile(
    generateTrialBalanceCSV(data.trialBalance),
    `Trial_Balance_${safeFileName}.csv`
  );
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  downloadFile(
    generateIncomeStatementCSV(data.incomeStatement),
    `Laba_Rugi_${safeFileName}.csv`
  );
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  downloadFile(
    generateBalanceSheetCSV(data.balanceSheet),
    `Neraca_${safeFileName}.csv`
  );
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  downloadFile(
    generateJournalEntriesCSV(data.journalEntries),
    `Jurnal_Umum_${safeFileName}.csv`
  );
}

export async function exportSingleReport(
  reportType: 'trial-balance' | 'income-statement' | 'balance-sheet' | 'journals',
  startDate: string,
  endDate: string,
  periodName: string
) {
  const safeFileName = periodName.replace(/\s+/g, '_');
  
  switch (reportType) {
    case 'trial-balance': {
      const data = await getTrialBalance(startDate, endDate);
      downloadFile(generateTrialBalanceCSV(data), `Trial_Balance_${safeFileName}.csv`);
      break;
    }
    case 'income-statement': {
      const data = await getIncomeStatement(startDate, endDate);
      downloadFile(generateIncomeStatementCSV(data), `Laba_Rugi_${safeFileName}.csv`);
      break;
    }
    case 'balance-sheet': {
      const data = await getBalanceSheet(endDate);
      downloadFile(generateBalanceSheetCSV(data), `Neraca_${safeFileName}.csv`);
      break;
    }
    case 'journals': {
      const data = await getJournalEntries({ startDate, endDate });
      downloadFile(generateJournalEntriesCSV(data), `Jurnal_Umum_${safeFileName}.csv`);
      break;
    }
  }
}