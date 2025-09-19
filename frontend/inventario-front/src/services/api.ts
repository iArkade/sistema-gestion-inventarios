import type {
    Product,
    CreateProductRequest,
    Transaction,
    CreateTransactionRequest,
    UpdateTransactionRequest,
    PagedResult,
    ApiResponse,
    FilterParameters,
} from '../types';

const API_BASE_URL = 'https://localhost:7001';
const TRANSACTION_API_URL = 'https://localhost:7002';

class SimpleCache {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    set(key: string, data: any, ttlSeconds: number = 300): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlSeconds * 1000
        });
    }

    get(key: string): any | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear(): void {
        this.cache.clear();
    }

    clearPattern(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

function invalidateRelatedCache(pattern: string): void {
    const relatedPatterns = [
        pattern,
        'transaction_products',
        'products_',
        'categories'
    ];

    relatedPatterns.forEach(p => {
        cache.clearPattern(p);
    });
}

const cache = new SimpleCache();

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeout: ReturnType<typeof setTimeout>;
    let resolveQueue: Array<{ resolve: Function; reject: Function }> = [];

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve, reject) => {
            resolveQueue.push({ resolve, reject });

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                try {
                    const result = await func(...args);
                    resolveQueue.forEach(({ resolve }) => resolve(result));
                } catch (error) {
                    resolveQueue.forEach(({ reject }) => reject(error));
                } finally {
                    resolveQueue = [];
                }
            }, wait);
        });
    };
}

class NotificationService {
    private static notificationQueue: string[] = [];
    private static isProcessing = false;

    static show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success'): void {
        if (this.notificationQueue.includes(message)) return;

        this.notificationQueue.push(message);

        if (!this.isProcessing) {
            this.processQueue(message, type);
        }
    }

    private static processQueue(
        message: string,
        type: 'success' | 'danger' | 'warning' | 'info'
    ): void {
        this.isProcessing = true;

        const existing = document.querySelectorAll('.notification');
        existing.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification`;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1060;
            min-width: 350px;
            max-width: 450px;
            animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-weight: 500;
        `;

        const iconMap: Record<'success' | 'danger' | 'warning' | 'info', string> = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${iconMap[type]} me-3" style="font-size: 1.2rem;"></i>
                <div class="flex-grow-1">
                    <div style="font-weight: 600; margin-bottom: 2px;">
                        ${type === 'success' ? 'Éxito' :
                type === 'danger' ? 'Error' :
                    type === 'warning' ? 'Atención' : 'Información'}
                    </div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
                </div>
                <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()" 
                        style="font-size: 0.8rem; opacity: 0.7;"></button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                    this.isProcessing = false;
                    this.notificationQueue = this.notificationQueue.filter(msg => msg !== message);
                }, 300);
            }
        }, 2000);
    }
}


async function cachedFetch(url: string, options: RequestInit = {}, cacheKey?: string, ttl: number = 300): Promise<any> {
    if (cacheKey && options.method === 'GET') {
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }

    let lastError: Error;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (cacheKey && options.method === 'GET' && result.success) {
                cache.set(cacheKey, result, ttl);
            }

            return result;
        } catch (error) {
            lastError = error as Error;

            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    throw lastError!;
}

export { NotificationService };

export const productApi = {
    getAll: debounce(async (filters: FilterParameters = {}): Promise<PagedResult<Product>> => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const cacheKey = `products_${params.toString()}`;
            const result: ApiResponse<PagedResult<Product>> = await cachedFetch(
                `${API_BASE_URL}/api/productos?${params}`,
                { method: 'GET' },
                cacheKey,
                180
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener productos');
            }

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    }, 500),

    getById: async (id: number): Promise<Product> => {
        try {
            const cacheKey = `product_${id}`;
            const result: ApiResponse<Product> = await cachedFetch(
                `${API_BASE_URL}/api/productos/${id}`,
                { method: 'GET' },
                cacheKey,
                300
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener producto');
            }

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    create: async (product: CreateProductRequest): Promise<Product> => {
        try {
            const result: ApiResponse<Product> = await cachedFetch(
                `${API_BASE_URL}/api/productos`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al crear producto');
            }

            cache.clearPattern('products_');
            cache.clearPattern('categories');

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    update: async (id: number, product: CreateProductRequest): Promise<Product> => {
        try {
            const result: ApiResponse<Product> = await cachedFetch(
                `${API_BASE_URL}/api/productos/${id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar producto');
            }

            cache.clearPattern('products_');
            cache.clearPattern(`product_${id}`);
            cache.clearPattern('categories');

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    delete: async (id: number): Promise<boolean> => {
        try {
            const result: ApiResponse<boolean> = await cachedFetch(
                `${API_BASE_URL}/api/productos/${id}`,
                { method: 'DELETE' }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar producto');
            }

            cache.clearPattern('products_');
            cache.clearPattern(`product_${id}`);

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    getCategories: async (): Promise<string[]> => {
        try {
            const cacheKey = 'categories';
            const result: ApiResponse<string[]> = await cachedFetch(
                `${API_BASE_URL}/api/productos/categories`,
                { method: 'GET' },
                cacheKey,
                600
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener categorías');
            }

            return result.data!;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            return [];
        }
    }
};

export const transactionApi = {
    getAll: debounce(async (filters: FilterParameters = {}): Promise<PagedResult<Transaction>> => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const cacheKey = `transactions_${params.toString()}`;
            const result: ApiResponse<PagedResult<Transaction>> = await cachedFetch(
                `${TRANSACTION_API_URL}/api/transacciones?${params}`,
                { method: 'GET' },
                cacheKey,
                120
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener transacciones');
            }

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    }, 500),

    create: async (transaction: CreateTransactionRequest): Promise<Transaction> => {
        try {
            const result: ApiResponse<Transaction> = await cachedFetch(
                `${TRANSACTION_API_URL}/api/transacciones`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al crear transacción');
            }

            invalidateRelatedCache('transactions_');
            cache.clear();

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    update: async (id: number, transaction: UpdateTransactionRequest): Promise<Transaction> => {
        try {
            const result: ApiResponse<Transaction> = await cachedFetch(
                `${TRANSACTION_API_URL}/api/transacciones/${id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar transacción');
            }

            invalidateRelatedCache('transactions_');
            cache.clear();

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    delete: async (id: number): Promise<boolean> => {
        try {
            const result: ApiResponse<boolean> = await cachedFetch(
                `${TRANSACTION_API_URL}/api/transacciones/${id}`,
                { method: 'DELETE' }
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar transacción');
            }

            invalidateRelatedCache('transactions_');
            cache.clear();
            
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    getProducts: async (forceRefresh: boolean = false): Promise<Product[]> => {
        try {
            const cacheKey = 'transaction_products';
            
            if (forceRefresh) {
                cache.clear();
            }
            
            const result: ApiResponse<Product[]> = await cachedFetch(
                `${TRANSACTION_API_URL}/api/transacciones/products`,
                { method: 'GET' },
                forceRefresh ? undefined : cacheKey,
                300
            );

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener productos');
            }

            return result.data!;
        } catch (error) {
            console.error('Error al obtener productos:', error);
            return [];
        }
    }
};