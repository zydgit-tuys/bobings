import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateItem {
  variant_id: string
  new_min_stock: number
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

    const body = await req.json()
    const { updates, apply_all = false, threshold_percent = 20 } = body as {
      updates?: UpdateItem[]
      apply_all?: boolean
      threshold_percent?: number
    }

    // Mode 1: Apply specific updates
    if (updates && updates.length > 0) {
      console.log(`Applying ${updates.length} specific updates`)

      // Batch update using Promise.all for efficiency
      const batchSize = 50
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        
        const results = await Promise.all(
          batch.map(async (item) => {
            const { error } = await supabase
              .from('product_variants')
              .update({ min_stock_alert: item.new_min_stock })
              .eq('id', item.variant_id)

            if (error) {
              errors.push(`${item.variant_id}: ${error.message}`)
              return false
            }
            return true
          })
        )

        successCount += results.filter(r => r).length
        errorCount += results.filter(r => !r).length
      }

      console.log(`Applied ${successCount} updates, ${errorCount} errors`)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'specific',
          applied: successCount,
          failed: errorCount,
          errors: errors.slice(0, 10), // Return first 10 errors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mode 2: Auto-apply calculated optimal stock
    if (apply_all) {
      console.log(`Auto-applying optimal stock with ${threshold_percent}% threshold`)

      // Call calculate-optimal-stock internally
      const { data: calcResult, error: calcError } = await supabase.functions.invoke(
        'calculate-optimal-stock',
        { body: { days_to_analyze: 30, safety_factor: 1.5 } }
      )

      if (calcError) throw calcError
      if (!calcResult.success) throw new Error(calcResult.error)

      const results = calcResult.results || []
      const toUpdate: UpdateItem[] = []

      for (const item of results) {
        const currentMin = item.current_min_stock
        const optimalMin = item.optimal_min_stock
        const diffPercent = Math.abs(optimalMin - currentMin) / Math.max(currentMin, 1) * 100

        // Only update if difference exceeds threshold
        if (diffPercent >= threshold_percent && item.avg_daily_sales > 0) {
          toUpdate.push({
            variant_id: item.variant_id,
            new_min_stock: optimalMin
          })
        }
      }

      console.log(`Found ${toUpdate.length} variants exceeding ${threshold_percent}% threshold`)

      if (toUpdate.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'auto',
            message: 'No updates needed - all variants within threshold',
            analyzed: results.length,
            applied: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Apply updates in batches
      const batchSize = 50
      let successCount = 0

      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize)
        
        const results = await Promise.all(
          batch.map(async (item) => {
            const { error } = await supabase
              .from('product_variants')
              .update({ 
                min_stock_alert: item.new_min_stock,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.variant_id)

            return !error
          })
        )

        successCount += results.filter(r => r).length
      }

      console.log(`Auto-applied ${successCount} updates`)

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'auto',
          analyzed: results.length,
          applied: successCount,
          threshold_percent,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Please provide "updates" array or set "apply_all" to true'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
