export interface Product {
    id: number;
    name: string;
    description?: string;
    category: string;
    imageUrl?: string;
    price: number;
    stock: number;
    createdAt: string;
}

export interface CreateProductRequest {
    name: string;
    description?: string;
    category: string;
    imageUrl?: string;
    price: number;
    stock: number;
}

export interface Transaction {
    id: number;
    transactionDate: string;
    transactionType: 'Purchase' | 'Sale';
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    details?: string;
}

export interface CreateTransactionRequest {
    transactionType: 'Purchase' | 'Sale';
    productId: number;
    quantity: number;
    unitPrice: number;
    details?: string;
}

export interface UpdateTransactionRequest {
    transactionType: 'Purchase' | 'Sale';
    productId: number;
    quantity: number;
    unitPrice: number;
    details?: string;
}

export interface PagedResult<T> {
    data: T[];
    totalRecords: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors: string[];
}

export interface FilterParameters {
    search?: string;
    category?: string;
    productId?: string | number;
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

export interface FormErrors {
    [key: string]: string;
}

export interface TransactionStats {
    totalTransactions: number;
    totalPurchases: number;
    totalSales: number;
    totalPurchaseAmount: number;
    totalSaleAmount: number;
}

export type NotificationType = 'success' | 'danger' | 'warning' | 'info';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}