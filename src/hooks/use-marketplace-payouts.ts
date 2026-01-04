import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Payout {
    id: string;
    payout_no: string;
    marketplace: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    total_orders: number;
    status: 'draft' | 'confirmed';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export function usePayouts() {
    return useQuery({
        queryKey: ["payouts"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("marketplace_payouts")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Payout[];
        },
    });
}

export function useCreatePayout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketplace,
            start_date,
            end_date,
        }: {
            marketplace: string;
            start_date: string;
            end_date: string;
        }) => {
            const { data, error } = await supabase.rpc("create_marketplace_payout", {
                p_marketplace: marketplace,
                p_start_date: start_date,
                p_end_date: end_date,
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message || "Failed to create payout");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payouts"] });
            // Also invalidate sales orders as their status/payout_id changes
            queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
            toast.success("Payout Draft Created");
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });
}

export function useConfirmPayout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            payoutId,
            bankAccountId,
        }: {
            payoutId: string;
            bankAccountId: string;
        }) => {
            const { data, error } = await supabase.rpc("confirm_marketplace_payout", {
                p_payout_id: payoutId,
                p_bank_account_id: bankAccountId,
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.message || "Failed to confirm payout");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payouts"] });
            toast.success("Payout Confirmed & Journaled");
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });
}
