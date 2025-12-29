import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SalesVelocity {
  variant_id: string
  sku_variant: string
  product_name: string
  total_sold: number
  days_analyzed: number
  avg_daily_sales: number
  sales_std_dev: number
}

interface LeadTimeData {
  variant_id: string
  supplier_id: string
  supplier_name: string
  avg_lead_time_days: number
  min_lead_time_days: number
  max_lead_time_days: number
  order_count: number
}

interface OptimalStockResult {
  variant_id: string
  sku_variant: string
  product_name: string
  current_stock: number
  current_min_stock: number
  avg_daily_sales: number
  lead_time_days: number
  safety_stock: number
  reorder_point: number
  optimal_min_stock: number
  recommendation: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const {
      days_to_analyze = 30,      // Analyze last N days of sales
      safety_factor = 1.5,       // Safety stock multiplier (1.5 = 50% buffer)
      default_lead_time = 7,     // Default lead time if no purchase data
      variant_ids = [],          // Optional: specific variants to analyze
    } = body

    console.log(`Calculating optimal stock - Days: ${days_to_analyze}, Safety: ${safety_factor}`)

    // ============================================
    // STEP 1: Calculate Sales Velocity per Variant
    // Using batch processing for large datasets
    // ============================================
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days_to_analyze)
    const startDateStr = startDate.toISOString().split('T')[0]

    console.log(`Analyzing sales from ${startDateStr}`)

    // Get sales data aggregated by variant
    let salesQuery = supabase
      .from('order_items')
      .select(`
        variant_id,
        qty,
        sku_variant,
        product_name,
        sales_orders!inner(order_date, status)
      `)
      .gte('sales_orders.order_date', startDateStr)
      .eq('sales_orders.status', 'completed')
      .not('variant_id', 'is', null)

    if (variant_ids.length > 0) {
      salesQuery = salesQuery.in('variant_id', variant_ids)
    }

    const { data: salesData, error: salesError } = await salesQuery

    if (salesError) {
      console.error('Sales query error:', salesError)
      throw salesError
    }

    console.log(`Found ${salesData?.length || 0} order items`)

    // Aggregate sales by variant with daily breakdown for std dev calculation
    const salesByVariant = new Map<string, {
      variant_id: string
      sku_variant: string
      product_name: string
      total_sold: number
      daily_sales: Map<string, number>
    }>()

    for (const item of salesData || []) {
      const variantId = item.variant_id
      const orderDate = (item.sales_orders as any).order_date
      
      if (!salesByVariant.has(variantId)) {
        salesByVariant.set(variantId, {
          variant_id: variantId,
          sku_variant: item.sku_variant || '',
          product_name: item.product_name,
          total_sold: 0,
          daily_sales: new Map()
        })
      }
      
      const variant = salesByVariant.get(variantId)!
      variant.total_sold += item.qty
      variant.daily_sales.set(
        orderDate,
        (variant.daily_sales.get(orderDate) || 0) + item.qty
      )
    }

    // Calculate velocity metrics
    const salesVelocity: SalesVelocity[] = []
    
    for (const [variantId, data] of salesByVariant) {
      const dailySalesValues = Array.from(data.daily_sales.values())
      const avgDailySales = data.total_sold / days_to_analyze
      
      // Calculate standard deviation for demand variability
      let variance = 0
      if (dailySalesValues.length > 1) {
        const mean = dailySalesValues.reduce((a, b) => a + b, 0) / dailySalesValues.length
        variance = dailySalesValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / dailySalesValues.length
      }
      const stdDev = Math.sqrt(variance)

      salesVelocity.push({
        variant_id: variantId,
        sku_variant: data.sku_variant,
        product_name: data.product_name,
        total_sold: data.total_sold,
        days_analyzed: days_to_analyze,
        avg_daily_sales: avgDailySales,
        sales_std_dev: stdDev
      })
    }

    console.log(`Calculated velocity for ${salesVelocity.length} variants`)

    // ============================================
    // STEP 2: Calculate Lead Time from Purchase Orders
    // Lead time = received_date - order_date
    // ============================================
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        id,
        supplier_id,
        order_date,
        received_date,
        suppliers(name),
        purchase_order_lines(variant_id)
      `)
      .not('received_date', 'is', null)
      .eq('status', 'received')

    if (purchaseError) {
      console.error('Purchase query error:', purchaseError)
      throw purchaseError
    }

    console.log(`Found ${purchaseData?.length || 0} completed purchases`)

    // Calculate lead time per variant-supplier combination
    const leadTimeByVariant = new Map<string, LeadTimeData[]>()

    for (const purchase of purchaseData || []) {
      const orderDate = new Date(purchase.order_date)
      const receivedDate = new Date(purchase.received_date!)
      const leadTimeDays = Math.ceil((receivedDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

      if (leadTimeDays < 0) continue // Invalid data

      const supplierName = (purchase.suppliers as any)?.name || 'Unknown'
      
      for (const line of purchase.purchase_order_lines || []) {
        const variantId = line.variant_id
        
        if (!leadTimeByVariant.has(variantId)) {
          leadTimeByVariant.set(variantId, [])
        }
        
        const existing = leadTimeByVariant.get(variantId)!.find(
          lt => lt.supplier_id === purchase.supplier_id
        )
        
        if (existing) {
          // Update running average
          const newCount = existing.order_count + 1
          existing.avg_lead_time_days = (existing.avg_lead_time_days * existing.order_count + leadTimeDays) / newCount
          existing.min_lead_time_days = Math.min(existing.min_lead_time_days, leadTimeDays)
          existing.max_lead_time_days = Math.max(existing.max_lead_time_days, leadTimeDays)
          existing.order_count = newCount
        } else {
          leadTimeByVariant.get(variantId)!.push({
            variant_id: variantId,
            supplier_id: purchase.supplier_id,
            supplier_name: supplierName,
            avg_lead_time_days: leadTimeDays,
            min_lead_time_days: leadTimeDays,
            max_lead_time_days: leadTimeDays,
            order_count: 1
          })
        }
      }
    }

    console.log(`Calculated lead time for ${leadTimeByVariant.size} variants`)

    // ============================================
    // STEP 3: Get Current Stock Data
    // ============================================
    let variantsQuery = supabase
      .from('product_variants')
      .select(`
        id,
        sku_variant,
        stock_qty,
        min_stock_alert,
        products(name)
      `)
      .eq('is_active', true)

    if (variant_ids.length > 0) {
      variantsQuery = variantsQuery.in('id', variant_ids)
    }

    const { data: variants, error: variantsError } = await variantsQuery

    if (variantsError) throw variantsError

    console.log(`Processing ${variants?.length || 0} active variants`)

    // ============================================
    // STEP 4: Calculate Optimal Stock
    // Formula: optimal_min_stock = (avg_daily_sales × lead_time) + safety_stock
    // Safety stock = safety_factor × std_dev × √lead_time
    // ============================================
    const results: OptimalStockResult[] = []

    for (const variant of variants || []) {
      const velocity = salesVelocity.find(v => v.variant_id === variant.id)
      const leadTimes = leadTimeByVariant.get(variant.id) || []
      
      // Use the average lead time from all suppliers, or default
      let avgLeadTime = default_lead_time
      if (leadTimes.length > 0) {
        avgLeadTime = leadTimes.reduce((sum, lt) => sum + lt.avg_lead_time_days, 0) / leadTimes.length
      }

      const avgDailySales = velocity?.avg_daily_sales || 0
      const salesStdDev = velocity?.sales_std_dev || 0

      // Calculate safety stock using statistical approach
      // Safety stock = Z-score × σ × √LT where Z ≈ 1.65 for 95% service level
      const zScore = 1.65
      const safetyStock = Math.ceil(zScore * salesStdDev * Math.sqrt(avgLeadTime) * safety_factor)

      // Reorder point = (average daily demand × lead time) + safety stock
      const reorderPoint = Math.ceil(avgDailySales * avgLeadTime + safetyStock)

      // Optimal min stock is the reorder point
      const optimalMinStock = Math.max(reorderPoint, 1) // At least 1

      // Generate recommendation
      let recommendation = ''
      const currentMin = variant.min_stock_alert
      const diff = optimalMinStock - currentMin

      if (avgDailySales === 0) {
        recommendation = 'No sales data - consider if item is still needed'
      } else if (diff > currentMin * 0.5) {
        recommendation = `INCREASE min stock by ${diff} units (high sales velocity)`
      } else if (diff < -currentMin * 0.3) {
        recommendation = `DECREASE min stock by ${Math.abs(diff)} units (low sales velocity)`
      } else {
        recommendation = 'Current min stock is appropriate'
      }

      results.push({
        variant_id: variant.id,
        sku_variant: variant.sku_variant,
        product_name: (variant.products as any)?.name || '',
        current_stock: variant.stock_qty,
        current_min_stock: currentMin,
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        lead_time_days: Math.round(avgLeadTime * 10) / 10,
        safety_stock: safetyStock,
        reorder_point: reorderPoint,
        optimal_min_stock: optimalMinStock,
        recommendation
      })
    }

    // Sort by recommendation priority (increases first)
    results.sort((a, b) => {
      if (a.recommendation.startsWith('INCREASE') && !b.recommendation.startsWith('INCREASE')) return -1
      if (!a.recommendation.startsWith('INCREASE') && b.recommendation.startsWith('INCREASE')) return 1
      return b.avg_daily_sales - a.avg_daily_sales
    })

    console.log(`Completed analysis for ${results.length} variants`)

    return new Response(
      JSON.stringify({
        success: true,
        params: {
          days_analyzed: days_to_analyze,
          safety_factor,
          default_lead_time,
        },
        summary: {
          total_variants: results.length,
          variants_with_sales: results.filter(r => r.avg_daily_sales > 0).length,
          need_increase: results.filter(r => r.recommendation.startsWith('INCREASE')).length,
          need_decrease: results.filter(r => r.recommendation.startsWith('DECREASE')).length,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
