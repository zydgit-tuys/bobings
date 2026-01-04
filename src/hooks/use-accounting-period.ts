import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodStatus {
    has_period: boolean;
    is_open: boolean;
    period_name: string | null;
    start_date: string | null;
    end_date: string | null;
    message: string;
}

export function useCurrentPeriodStatus() {
    return useQuery({
        queryKey: ['current-period-status'],
        queryFn: async (): Promise<PeriodStatus> => {
            const { data, error } = await supabase
                .rpc('get_current_period_status')
                .single();

            if (error) {
                console.error('Error fetching period status:', error);
                // Return safe default
                return {
                    has_period: false,
                    is_open: false,
                    period_name: null,
                    start_date: null,
                    end_date: null,
                    message: 'Unable to check period status. Please contact administrator.',
                };
            }

            return data;
        },
        refetchInterval: 60000, // Refresh every minute
        staleTime: 30000, // Consider data stale after 30 seconds
    });
}
