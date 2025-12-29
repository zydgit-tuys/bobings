import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse, handleCors } from "../_shared/cors.ts";
import { runAllTests } from "../_tests/test-runner.ts";

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('🧪 Starting backend tests...');
    
    const { success, summary } = await runAllTests();

    return jsonResponse({
      success,
      message: success ? 'All tests passed' : 'Some tests failed',
      summary: {
        totalSuites: summary.suites.length,
        totalTests: summary.totalTests,
        passed: summary.totalPassed,
        failed: summary.totalFailed,
        duration: `${summary.totalDuration.toFixed(2)}ms`,
        suites: summary.suites.map(s => ({
          name: s.name,
          passed: s.totalPassed,
          failed: s.totalFailed,
          tests: s.results.map(r => ({
            name: r.name,
            passed: r.passed,
            duration: `${r.duration.toFixed(2)}ms`,
            error: r.error,
          })),
        })),
      },
    });

  } catch (error) {
    console.error('❌ Test runner error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ success: false, error: errMsg }, 500);
  }
});
