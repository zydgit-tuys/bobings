// ============================================
// END-TO-END TEST RUNNER FOR BACKEND
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
}

class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  startSuite(name: string) {
    this.currentSuite = {
      name,
      results: [],
      totalPassed: 0,
      totalFailed: 0,
      totalDuration: 0,
    };
  }

  async test(name: string, fn: () => Promise<void>) {
    if (!this.currentSuite) throw new Error('No test suite started');
    
    const start = performance.now();
    let passed = true;
    let error: string | undefined;

    try {
      await fn();
    } catch (e) {
      passed = false;
      error = e instanceof Error ? e.message : String(e);
    }

    const duration = performance.now() - start;
    const result: TestResult = { name, passed, duration, error };
    
    this.currentSuite.results.push(result);
    this.currentSuite.totalDuration += duration;
    
    if (passed) {
      this.currentSuite.totalPassed++;
      console.log(`  ✅ ${name} (${duration.toFixed(2)}ms)`);
    } else {
      this.currentSuite.totalFailed++;
      console.log(`  ❌ ${name} (${duration.toFixed(2)}ms)`);
      console.log(`     Error: ${error}`);
    }
  }

  endSuite() {
    if (!this.currentSuite) return;
    this.suites.push(this.currentSuite);
    console.log(`\n📊 Suite "${this.currentSuite.name}": ${this.currentSuite.totalPassed}/${this.currentSuite.results.length} passed\n`);
    this.currentSuite = null;
  }

  getSummary() {
    const totalTests = this.suites.reduce((sum, s) => sum + s.results.length, 0);
    const totalPassed = this.suites.reduce((sum, s) => sum + s.totalPassed, 0);
    const totalFailed = this.suites.reduce((sum, s) => sum + s.totalFailed, 0);
    const totalDuration = this.suites.reduce((sum, s) => sum + s.totalDuration, 0);

    return {
      suites: this.suites,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      allPassed: totalFailed === 0,
    };
  }
}

// Assertion helpers
function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertNotNull<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to not be null/undefined');
  }
}

function assertArrayLength(arr: unknown[], expected: number, message?: string) {
  if (arr.length !== expected) {
    throw new Error(message || `Expected array length ${expected}, got ${arr.length}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message?: string) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
  }
}

// ============================================
// TEST SUITES
// ============================================

const runner = new TestRunner();

// -------------------- SUPPLIERS TESTS --------------------
async function runSupplierTests() {
  runner.startSuite('Suppliers CRUD');
  
  let testSupplierId: string;

  await runner.test('Create supplier', async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        code: 'TEST-SUP-001',
        name: 'Test Supplier',
        contact_person: 'John Doe',
        phone: '08123456789',
        email: 'test@supplier.com',
        city: 'Jakarta',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.code, 'TEST-SUP-001');
    testSupplierId = data.id;
  });

  await runner.test('Read supplier', async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', testSupplierId)
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.name, 'Test Supplier');
  });

  await runner.test('Update supplier', async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ name: 'Updated Supplier' })
      .eq('id', testSupplierId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertEqual(data?.name, 'Updated Supplier');
  });

  await runner.test('Delete supplier', async () => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', testSupplierId);

    if (error) throw new Error(error.message);

    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', testSupplierId)
      .single();

    assertEqual(data, null, 'Supplier should be deleted');
  });

  runner.endSuite();
}

// -------------------- PRODUCTS & VARIANTS TESTS --------------------
async function runProductTests() {
  runner.startSuite('Products & Variants');

  let testProductId: string;
  let testVariantId: string;

  await runner.test('Create product', async () => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku_master: 'TEST-PRD-001',
        name: 'Test Product',
        base_price: 100000,
        description: 'Test product description',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    testProductId = data.id;
  });

  await runner.test('Create product variant', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        product_id: testProductId,
        sku_variant: 'TEST-PRD-001-RED-M',
        price: 100000,
        hpp: 50000,
        stock_qty: 100,
        min_stock_alert: 10,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    testVariantId = data.id;
  });

  await runner.test('Read variant with product relation', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, products(name, sku_master)')
      .eq('id', testVariantId)
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertNotNull(data.products);
  });

  await runner.test('Update stock quantity', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .update({ stock_qty: 80 })
      .eq('id', testVariantId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertEqual(data?.stock_qty, 80);
  });

  // Cleanup
  await runner.test('Cleanup - Delete variant and product', async () => {
    await supabase.from('product_variants').delete().eq('id', testVariantId);
    await supabase.from('products').delete().eq('id', testProductId);
  });

  runner.endSuite();
}

// -------------------- PURCHASES TESTS --------------------
async function runPurchaseTests() {
  runner.startSuite('Purchases Flow');

  let testSupplierId: string;
  let testProductId: string;
  let testVariantId: string;
  let testPurchaseId: string;

  // Setup
  await runner.test('Setup - Create supplier and product', async () => {
    // Create supplier
    const { data: supplier, error: supError } = await supabase
      .from('suppliers')
      .insert({ code: 'PO-TEST-SUP', name: 'PO Test Supplier' })
      .select()
      .single();
    if (supError) throw new Error(supError.message);
    testSupplierId = supplier.id;

    // Create product
    const { data: product, error: prdError } = await supabase
      .from('products')
      .insert({ sku_master: 'PO-TEST-PRD', name: 'PO Test Product', base_price: 50000 })
      .select()
      .single();
    if (prdError) throw new Error(prdError.message);
    testProductId = product.id;

    // Create variant
    const { data: variant, error: varError } = await supabase
      .from('product_variants')
      .insert({
        product_id: testProductId,
        sku_variant: 'PO-TEST-PRD-VAR',
        price: 50000,
        hpp: 25000,
        stock_qty: 0,
      })
      .select()
      .single();
    if (varError) throw new Error(varError.message);
    testVariantId = variant.id;
  });

  await runner.test('Create purchase order', async () => {
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        purchase_no: 'PO-TEST-001',
        supplier_id: testSupplierId,
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.status, 'draft');
    testPurchaseId = data.id;
  });

  await runner.test('Add purchase order line', async () => {
    const { data, error } = await supabase
      .from('purchase_order_lines')
      .insert({
        purchase_id: testPurchaseId,
        variant_id: testVariantId,
        qty_ordered: 50,
        unit_cost: 25000,
        subtotal: 1250000,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.qty_ordered, 50);
  });

  await runner.test('Verify purchase totals trigger', async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select('total_qty, total_amount')
      .eq('id', testPurchaseId)
      .single();

    if (error) throw new Error(error.message);
    assertEqual(data?.total_qty, 50);
    assertEqual(data?.total_amount, 1250000);
  });

  await runner.test('Update status to ordered', async () => {
    const { data, error } = await supabase
      .from('purchases')
      .update({ status: 'ordered' })
      .eq('id', testPurchaseId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertEqual(data?.status, 'ordered');
  });

  await runner.test('Receive partial goods (qty_received update)', async () => {
    const { error } = await supabase
      .from('purchase_order_lines')
      .update({ qty_received: 30 })
      .eq('purchase_id', testPurchaseId);

    if (error) throw new Error(error.message);

    // Check stock movement created
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('variant_id', testVariantId)
      .eq('reference_type', 'purchase')
      .eq('reference_id', testPurchaseId);

    assertNotNull(movements);
    assertGreaterThan(movements.length, 0);
  });

  await runner.test('Verify stock quantity updated', async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('stock_qty')
      .eq('id', testVariantId)
      .single();

    if (error) throw new Error(error.message);
    assertEqual(data?.stock_qty, 30);
  });

  // Cleanup
  await runner.test('Cleanup - Delete test data', async () => {
    await supabase.from('stock_movements').delete().eq('variant_id', testVariantId);
    await supabase.from('purchase_order_lines').delete().eq('purchase_id', testPurchaseId);
    await supabase.from('purchases').delete().eq('id', testPurchaseId);
    await supabase.from('product_variants').delete().eq('id', testVariantId);
    await supabase.from('products').delete().eq('id', testProductId);
    await supabase.from('suppliers').delete().eq('id', testSupplierId);
  });

  runner.endSuite();
}

// -------------------- SALES IMPORT TESTS --------------------
async function runSalesImportTests() {
  runner.startSuite('Sales Import Flow');

  let testProductId: string;
  let testVariantId: string;

  // Setup
  await runner.test('Setup - Create product with stock', async () => {
    const { data: product, error: prdError } = await supabase
      .from('products')
      .insert({ sku_master: 'SALE-TEST-001', name: 'Sale Test Product', base_price: 100000 })
      .select()
      .single();
    if (prdError) throw new Error(prdError.message);
    testProductId = product.id;

    const { data: variant, error: varError } = await supabase
      .from('product_variants')
      .insert({
        product_id: testProductId,
        sku_variant: 'SALE-TEST-001-VAR',
        price: 100000,
        hpp: 50000,
        stock_qty: 100,
      })
      .select()
      .single();
    if (varError) throw new Error(varError.message);
    testVariantId = variant.id;
  });

  await runner.test('Create sales import record', async () => {
    const { data, error } = await supabase
      .from('sales_imports')
      .insert({
        filename: 'test-import.xlsx',
        status: 'pending',
        total_orders: 0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.status, 'pending');
  });

  await runner.test('Create sales order', async () => {
    const { data: importRec } = await supabase
      .from('sales_imports')
      .select('id')
      .eq('filename', 'test-import.xlsx')
      .single();

    const { data, error } = await supabase
      .from('sales_orders')
      .insert({
        import_id: importRec?.id,
        desty_order_no: 'TEST-ORDER-001',
        marketplace: 'Shopee',
        order_date: new Date().toISOString().split('T')[0],
        customer_name: 'Test Customer',
        total_amount: 100000,
        total_hpp: 50000,
        total_fees: 5000,
        profit: 45000,
        status: 'completed',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertEqual(data.marketplace, 'Shopee');
  });

  await runner.test('Create order items', async () => {
    const { data: order } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('desty_order_no', 'TEST-ORDER-001')
      .single();

    const { data, error } = await supabase
      .from('order_items')
      .insert({
        order_id: order?.id,
        variant_id: testVariantId,
        sku_variant: 'SALE-TEST-001-VAR',
        product_name: 'Sale Test Product',
        qty: 2,
        unit_price: 100000,
        hpp: 50000,
        subtotal: 200000,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
  });

  await runner.test('Create stock movement for sale', async () => {
    const { data: order } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('desty_order_no', 'TEST-ORDER-001')
      .single();

    const { error } = await supabase
      .from('stock_movements')
      .insert({
        variant_id: testVariantId,
        movement_type: 'SALE',
        qty: 2,
        reference_type: 'sales_order',
        reference_id: order?.id,
        notes: 'Test sale',
      });

    if (error) throw new Error(error.message);
  });

  // Cleanup
  await runner.test('Cleanup - Delete test data', async () => {
    const { data: order } = await supabase
      .from('sales_orders')
      .select('id')
      .eq('desty_order_no', 'TEST-ORDER-001')
      .single();

    const { data: importRec } = await supabase
      .from('sales_imports')
      .select('id')
      .eq('filename', 'test-import.xlsx')
      .single();

    if (order) {
      await supabase.from('stock_movements').delete().eq('reference_id', order.id);
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('sales_orders').delete().eq('id', order.id);
    }
    if (importRec) {
      await supabase.from('sales_imports').delete().eq('id', importRec.id);
    }
    await supabase.from('product_variants').delete().eq('id', testVariantId);
    await supabase.from('products').delete().eq('id', testProductId);
  });

  runner.endSuite();
}

// -------------------- JOURNAL ENTRIES TESTS --------------------
async function runJournalTests() {
  runner.startSuite('Journal Entries');

  let testEntryId: string;

  await runner.test('Create journal entry', async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        description: 'Test Journal Entry',
        reference_type: 'test',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    testEntryId = data.id;
  });

  await runner.test('Create balanced journal lines', async () => {
    // Get first two accounts
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .limit(2);

    if (!accounts || accounts.length < 2) throw new Error('Need at least 2 accounts');

    const { error } = await supabase
      .from('journal_lines')
      .insert([
        { entry_id: testEntryId, account_id: accounts[0].id, debit: 100000, credit: 0, description: 'Debit line' },
        { entry_id: testEntryId, account_id: accounts[1].id, debit: 0, credit: 100000, description: 'Credit line' },
      ]);

    if (error) throw new Error(error.message);
  });

  await runner.test('Read journal entry with lines', async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, journal_lines(*)')
      .eq('id', testEntryId)
      .single();

    if (error) throw new Error(error.message);
    assertNotNull(data);
    assertArrayLength(data.journal_lines, 2);
  });

  await runner.test('Verify trial balance function', async () => {
    const { data, error } = await supabase.rpc('get_trial_balance');

    if (error) throw new Error(error.message);
    assertNotNull(data);
  });

  // Cleanup
  await runner.test('Cleanup - Delete journal data', async () => {
    await supabase.from('journal_lines').delete().eq('entry_id', testEntryId);
    await supabase.from('journal_entries').delete().eq('id', testEntryId);
  });

  runner.endSuite();
}

// -------------------- INVENTORY ALERTS TESTS --------------------
async function runInventoryAlertTests() {
  runner.startSuite('Inventory Alerts');

  await runner.test('Get inventory alerts function', async () => {
    const { data, error } = await supabase.rpc('get_inventory_alerts');

    if (error) throw new Error(error.message);
    assertNotNull(data);
  });

  runner.endSuite();
}

// ============================================
// MAIN RUNNER
// ============================================

export async function runAllTests(): Promise<{
  success: boolean;
  summary: ReturnType<TestRunner['getSummary']>;
}> {
  console.log('\n🧪 BACKEND END-TO-END TESTS\n');
  console.log('='.repeat(50));

  try {
    await runSupplierTests();
    await runProductTests();
    await runPurchaseTests();
    await runSalesImportTests();
    await runJournalTests();
    await runInventoryAlertTests();
  } catch (error) {
    console.error('Fatal error during tests:', error);
  }

  const summary = runner.getSummary();

  console.log('\n' + '='.repeat(50));
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Suites: ${summary.suites.length}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.totalPassed} ✅`);
  console.log(`Failed: ${summary.totalFailed} ❌`);
  console.log(`Duration: ${summary.totalDuration.toFixed(2)}ms`);
  console.log('='.repeat(50));

  if (summary.allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED!\n');
  }

  return { success: summary.allPassed, summary };
}
