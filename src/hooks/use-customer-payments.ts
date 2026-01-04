import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getCustomerPayments,
    getCustomerPayment,
    createCustomerPayment,
    getCustomerOutstandingOrders,
    type PaymentFilters,
    type CreatePaymentData,
} from '@/lib/api/customer-payments';

export const useCustomerPayments = (filters?: PaymentFilters) => {
    return useQuery({
        queryKey: ['customer-payments', filters],
        queryFn: () => getCustomerPayments(filters),
    });
};

export const useCustomerPayment = (id: string) => {
    return useQuery({
        queryKey: ['customer-payment', id],
        queryFn: () => getCustomerPayment(id),
        enabled: !!id,
    });
};

export const useCreateCustomerPayment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCustomerPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
            toast.success('Payment berhasil dibuat dan dijurnal');
        },
        onError: (error: Error) => {
            toast.error(`Gagal membuat payment: ${error.message}`);
        },
    });
};

export const useCustomerOutstandingOrders = (customerId: string) => {
    return useQuery({
        queryKey: ['customer-outstanding-orders', customerId],
        queryFn: () => getCustomerOutstandingOrders(customerId),
        enabled: !!customerId,
    });
};
