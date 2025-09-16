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

class NotificationService {
    static show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success'): void {
        // Remover notificaciones previas para evitar acumulación
        const existing = document.querySelectorAll('.notification');
        existing.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show notification`;

        // Estilos inline para posicionamiento
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

        // Iconos según el tipo
        const iconMap = {
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

        // Auto-remover con animación
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4500);
    }
}

// Agregar estilos de animación si no existen
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { 
                transform: translateX(100%); 
                opacity: 0; 
            }
            to { 
                transform: translateX(0); 
                opacity: 1; 
            }
        }
        @keyframes slideOut {
            from { 
                transform: translateX(0); 
                opacity: 1; 
            }
            to { 
                transform: translateX(100%); 
                opacity: 0; 
            }
        }
    `;
    document.head.appendChild(style);
}

export { NotificationService };

export const productApi = {
    getAll: async (filters: FilterParameters = {}): Promise<PagedResult<Product>> => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const response = await fetch(`${API_BASE_URL}/api/productos?${params}`);
            const result: ApiResponse<PagedResult<Product>> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener productos');
            }

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    getById: async (id: number): Promise<Product> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/${id}`);
            const result: ApiResponse<Product> = await response.json();

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
            const response = await fetch(`${API_BASE_URL}/api/productos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });

            const result: ApiResponse<Product> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al crear producto');
            }

            NotificationService.show('Producto creado exitosamente', 'success');
            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    update: async (id: number, product: CreateProductRequest): Promise<Product> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });

            const result: ApiResponse<Product> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar producto');
            }

            NotificationService.show('Producto actualizado exitosamente', 'success');
            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    delete: async (id: number): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
                method: 'DELETE'
            });

            const result: ApiResponse<boolean> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar producto');
            }

            NotificationService.show('Producto eliminado exitosamente', 'success');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    getCategories: async (): Promise<string[]> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/categories`);
            const result: ApiResponse<string[]> = await response.json();

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
    getAll: async (filters: FilterParameters = {}): Promise<PagedResult<Transaction>> => {
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const response = await fetch(`${TRANSACTION_API_URL}/api/transacciones?${params}`);
            const result: ApiResponse<PagedResult<Transaction>> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al obtener transacciones');
            }

            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    create: async (transaction: CreateTransactionRequest): Promise<Transaction> => {
        try {
            const response = await fetch(`${TRANSACTION_API_URL}/api/transacciones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });

            const result: ApiResponse<Transaction> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al crear transacción');
            }

            NotificationService.show('Transacción creada exitosamente', 'success');
            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    update: async (id: number, transaction: UpdateTransactionRequest): Promise<Transaction> => {
        try {
            const response = await fetch(`${TRANSACTION_API_URL}/api/transacciones/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });

            const result: ApiResponse<Transaction> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al actualizar transacción');
            }

            NotificationService.show('Transacción actualizada exitosamente', 'success');
            return result.data!;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    delete: async (id: number): Promise<boolean> => {
        try {
            const response = await fetch(`${TRANSACTION_API_URL}/api/transacciones/${id}`, {
                method: 'DELETE'
            });

            const result: ApiResponse<boolean> = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Error al eliminar transacción');
            }

            NotificationService.show('Transacción eliminada exitosamente', 'success');
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            NotificationService.show(`Error: ${message}`, 'danger');
            throw error;
        }
    },

    getProducts: async (): Promise<Product[]> => {
        try {
            const response = await fetch(`${TRANSACTION_API_URL}/api/transacciones/products`);
            const result: ApiResponse<Product[]> = await response.json();

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