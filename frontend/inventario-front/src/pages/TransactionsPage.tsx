import React, { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { transactionApi, NotificationService } from '../services/api';
import type {
    Transaction,
    CreateTransactionRequest,
    UpdateTransactionRequest,
    Product,
    FormErrors,
    FilterParameters
} from '../types';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const TransactionsPage: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const [filters, setFilters] = useState({
        productFilter: '',
        typeFilter: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    });

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        totalRecords: 0,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const [formData, setFormData] = useState<CreateTransactionRequest>({
        transactionType: 'Purchase',
        productId: 0,
        quantity: 1,
        unitPrice: 0,
        details: ''
    });

    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        loadTransactions();
        loadProducts();
    }, [filters, pagination.currentPage, pagination.pageSize]);

    const loadTransactions = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const filterParams: FilterParameters = {
                productId: filters.productFilter ? parseInt(filters.productFilter) : undefined,
                transactionType: filters.typeFilter || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                search: filters.search || undefined,
                sortBy: 'date',
                sortDirection: 'desc',
                page: pagination.currentPage,
                pageSize: pagination.pageSize
            };

            const result = await transactionApi.getAll(filterParams);
            setTransactions(result.data);
            setPagination(prev => ({
                ...prev,
                totalPages: result.totalPages,
                totalRecords: result.totalRecords,
                hasNextPage: result.hasNextPage,
                hasPreviousPage: result.hasPreviousPage
            }));
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.currentPage, pagination.pageSize]);

    const loadProducts = useCallback(async (forceRefresh: boolean = false): Promise<void> => {
        try {
            const result = await transactionApi.getProducts(forceRefresh);
            setProducts(result);

            if (selectedProduct) {
                const updatedProduct = result.find(p => p.id === selectedProduct.id);
                if (updatedProduct) {
                    setSelectedProduct(updatedProduct);
                }
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }, [selectedProduct]);

    const validateForm = useCallback((): boolean => {
        const errors: FormErrors = {};

        if (!formData.transactionType) {
            errors.transactionType = 'Selecciona el tipo de transacción';
        }

        if (!formData.productId) {
            errors.productId = 'Selecciona un producto';
        }

        if (formData.quantity <= 0) {
            errors.quantity = 'La cantidad debe ser mayor a 0';
        }

        if (formData.unitPrice <= 0) {
            errors.unitPrice = 'El precio debe ser mayor a 0';
        }

        if (formData.transactionType === 'Sale' && selectedProduct) {
            if (formData.quantity > selectedProduct.stock) {
                errors.quantity = `Stock insuficiente. Solo hay ${selectedProduct.stock} unidades disponibles`;
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, selectedProduct]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!validateForm()) {
            NotificationService.show('Corrige los errores en el formulario', 'warning');
            return;
        }

        try {
            if (editingTransaction) {
                const updateData: UpdateTransactionRequest = {
                    transactionType: formData.transactionType,
                    productId: formData.productId,
                    quantity: formData.quantity,
                    unitPrice: formData.unitPrice,
                    details: formData.details
                };
                await transactionApi.update(editingTransaction.id, updateData);
            } else {
                await transactionApi.create(formData);
            }

            handleCloseForm();
            await Promise.all([loadTransactions(), loadProducts(true)]);
        } catch (error) {
            console.error('Error al guardar transacción:', error);
        }
    };

    const handleEdit = async (transaction: Transaction): Promise<void> => {
        setEditingTransaction(transaction);
        setFormData({
            transactionType: transaction.transactionType,
            productId: transaction.productId,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            details: transaction.details || ''
        });

        await loadProducts(true);
        const product = products.find(p => p.id === transaction.productId);
        setSelectedProduct(product || null);
        setFormErrors({});
        setShowForm(true);
    };

    const handleDelete = async (transaction: Transaction): Promise<void> => {
        const confirmed = window.confirm(
            `¿Eliminar esta transacción?\n\n` +
            `${transaction.transactionType === 'Purchase' ? '🔻 Compra' : '🔺 Venta'}\n` +
            `Producto: ${transaction.productName}\n` +
            `Cantidad: ${transaction.quantity} unidades\n` +
            `Total: $${transaction.totalPrice.toFixed(2)}\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (confirmed) {
            try {
                await transactionApi.delete(transaction.id);
                await Promise.all([loadTransactions(), loadProducts(true)]);
            } catch (error) {
                console.error('Error al eliminar transacción:', error);
            }
        }
    };

    const handleProductChange = useCallback(async (productIdString: string): Promise<void> => {
        const productId = productIdString ? parseInt(productIdString) : 0;

        const product = products.find(p => p.id === productId);
        setSelectedProduct(product || null);
        setFormData(prev => ({
            ...prev,
            productId: productId,
            unitPrice: product ? product.price : 0
        }));

        if (formErrors.productId) {
            setFormErrors(prev => {
                const { productId, ...rest } = prev;
                return rest;
            });
        }
    }, [products, formErrors.productId]);

    const handleCloseForm = (): void => {
        setShowForm(false);
        setEditingTransaction(null);
        setFormData({ transactionType: 'Purchase', productId: 0, quantity: 1, unitPrice: 0, details: '' });
        setSelectedProduct(null);
        setFormErrors({});
    };

    const handleFilterChange = (newFilters: Partial<typeof filters>): void => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (page: number): void => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    };

    const clearFilters = (): void => {
        setFilters({
            productFilter: '',
            typeFilter: '',
            dateFrom: '',
            dateTo: '',
            search: ''
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        const { name, value, type } = e.target;

        if (name === 'productId') {
            handleProductChange(value);
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => {
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getTotalPrice = (): string => {
        return (formData.quantity * formData.unitPrice).toFixed(2);
    };

    const stats = {
        total: transactions.length,
        purchases: transactions.filter(t => t.transactionType === 'Purchase').length,
        sales: transactions.filter(t => t.transactionType === 'Sale').length,
        purchaseAmount: transactions.filter(t => t.transactionType === 'Purchase').reduce((sum, t) => sum + t.totalPrice, 0),
        saleAmount: transactions.filter(t => t.transactionType === 'Sale').reduce((sum, t) => sum + t.totalPrice, 0)
    };

    return (
        <div className="container-fluid py-4">
            {/* Header Profesional */}
            <div className="row align-items-center mb-4">
                <div className="col">
                    <div className="d-flex align-items-center">
                        <div className="icon-box bg-primary me-3">
                            <i className="fas fa-exchange-alt"></i>
                        </div>
                        <div>
                            <h1 className="h3 mb-0 fw-bold">Gestión de Transacciones</h1>
                            <p className="text-muted mb-0">Administra compras y ventas de inventario</p>
                        </div>
                    </div>
                </div>
                <div className="col-auto">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={async () => {
                            setShowForm(true);
                            setEditingTransaction(null);
                            setFormData({ transactionType: 'Purchase', productId: 0, quantity: 1, unitPrice: 0, details: '' });
                            setSelectedProduct(null);
                            setFormErrors({});
                            await loadProducts(true);
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Nueva Transacción
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="row mb-4">
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="stats-card">
                        <div className="stats-icon bg-primary">
                            <i className="fas fa-exchange-alt"></i>
                        </div>
                        <div className="stats-content">
                            <h3 className="stats-number">{stats.total}</h3>
                            <p className="stats-label">Total Transacciones</p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="stats-card">
                        <div className="stats-icon bg-success">
                            <i className="fas fa-arrow-down"></i>
                        </div>
                        <div className="stats-content">
                            <h3 className="stats-number">{stats.purchases}</h3>
                            <p className="stats-label">Compras</p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="stats-card">
                        <div className="stats-icon bg-danger">
                            <i className="fas fa-arrow-up"></i>
                        </div>
                        <div className="stats-content">
                            <h3 className="stats-number">{stats.sales}</h3>
                            <p className="stats-label">Ventas</p>
                        </div>
                    </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                    <div className="stats-card">
                        <div className="stats-icon bg-info">
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="stats-content">
                            <h3 className="stats-number">{formatPrice(stats.saleAmount - stats.purchaseAmount)}</h3>
                            <p className="stats-label">Utilidad</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros Simplificados */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="card-title mb-0">
                        <i className="fas fa-filter me-2"></i>
                        Filtros
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Buscar</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Producto o detalles..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange({ search: e.target.value })}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Producto</label>
                            <select
                                className="form-select"
                                value={filters.productFilter}
                                onChange={(e) => handleFilterChange({ productFilter: e.target.value })}
                            >
                                <option value="">Todos</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id.toString()}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Tipo</label>
                            <select
                                className="form-select"
                                value={filters.typeFilter}
                                onChange={(e) => handleFilterChange({ typeFilter: e.target.value })}
                            >
                                <option value="">Todos</option>
                                <option value="Purchase">Compra</option>
                                <option value="Sale">Venta</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Desde</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Hasta</label>
                            <input
                                type="date"
                                className="form-control"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col">
                            <button className="btn btn-outline-secondary" onClick={clearFilters}>
                                <i className="fas fa-times me-2"></i>
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Formulario Mejorado */}
            {showForm && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className={`fas ${editingTransaction ? 'fa-edit text-warning' : 'fa-plus text-success'} me-2`}></i>
                                    {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
                                </h5>
                                <button className="btn-close" onClick={handleCloseForm}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Tipo de Transacción <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                name="transactionType"
                                                className={`form-select ${formErrors.transactionType ? 'is-invalid' : ''}`}
                                                value={formData.transactionType}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="Purchase">🔻 Compra (Aumenta stock)</option>
                                                <option value="Sale">🔺 Venta (Reduce stock)</option>
                                            </select>
                                            {formErrors.transactionType && (
                                                <div className="invalid-feedback">{formErrors.transactionType}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Producto <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                name="productId"
                                                className={`form-select ${formErrors.productId ? 'is-invalid' : ''}`}
                                                value={formData.productId || ''}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Seleccionar producto</option>
                                                {products.map(product => (
                                                    <option key={product.id} value={product.id.toString()}>
                                                        {product.name} (Stock: {product.stock})
                                                    </option>
                                                ))}
                                            </select>
                                            {formErrors.productId && (
                                                <div className="invalid-feedback">{formErrors.productId}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Información del producto seleccionado */}
                                    {selectedProduct && (
                                        <div className="alert alert-info mt-3">
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <strong>📦 Producto:</strong> {selectedProduct.name}<br />
                                                    <strong>📊 Stock disponible:</strong>
                                                    <span className={`fw-bold ms-1 ${selectedProduct.stock === 0 ? 'text-danger' :
                                                            selectedProduct.stock < 10 ? 'text-warning' : 'text-success'
                                                        }`}>
                                                        {selectedProduct.stock} unidades
                                                    </span>
                                                </div>
                                                <div className="col-md-6">
                                                    <strong>💰 Precio sugerido:</strong> {formatPrice(selectedProduct.price)}<br />
                                                    <strong>🏷️ Categoría:</strong> {selectedProduct.category}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="row g-3 mt-2">
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                Cantidad <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                className={`form-control ${formErrors.quantity ? 'is-invalid' : ''}`}
                                                value={formData.quantity}
                                                onChange={handleInputChange}
                                                min="1"
                                                required
                                            />
                                            {formErrors.quantity && (
                                                <div className="invalid-feedback">{formErrors.quantity}</div>
                                            )}
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                Precio Unitario <span className="text-danger">*</span>
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">$</span>
                                                <input
                                                    type="number"
                                                    name="unitPrice"
                                                    step="0.01"
                                                    className={`form-control ${formErrors.unitPrice ? 'is-invalid' : ''}`}
                                                    value={formData.unitPrice}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                                {formErrors.unitPrice && (
                                                    <div className="invalid-feedback">{formErrors.unitPrice}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Total</label>
                                            <div className="input-group">
                                                <span className="input-group-text">$</span>
                                                <input
                                                    type="text"
                                                    className="form-control fw-bold bg-light"
                                                    value={getTotalPrice()}
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label">Detalles Adicionales</label>
                                        <textarea
                                            name="details"
                                            className="form-control"
                                            rows={3}
                                            value={formData.details || ''}
                                            onChange={handleInputChange}
                                            placeholder="Información adicional (opcional)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save me-2"></i>
                                        {editingTransaction ? 'Actualizar' : 'Crear'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla de Transacciones */}
            {loading ? (
                <div className="card">
                    <div className="card-body">
                        <LoadingSpinner />
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0">Historial de Transacciones</h5>
                            <small className="text-muted">
                                {transactions.length} de {pagination.totalRecords} registros
                            </small>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {transactions.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Tipo</th>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>P. Unitario</th>
                                            <th>Total</th>
                                            <th>Detalles</th>
                                            <th style={{ width: '120px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(transaction => (
                                            <tr key={transaction.id}>
                                                <td>
                                                    <div className="small">
                                                        <div className="fw-semibold">
                                                            {new Date(transaction.transactionDate).toLocaleDateString('es-ES')}
                                                        </div>
                                                        <div className="text-muted">
                                                            {new Date(transaction.transactionDate).toLocaleTimeString('es-ES', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${transaction.transactionType === 'Purchase' ? 'bg-success' : 'bg-danger'
                                                        }`}>
                                                        {transaction.transactionType === 'Purchase' ? 'Compra' : 'Venta'}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold">{transaction.productName}</td>
                                                <td>
                                                    <span className={`fw-bold ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'
                                                        }`}>
                                                        {transaction.transactionType === 'Purchase' ? '+' : '-'}{transaction.quantity}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold">{formatPrice(transaction.unitPrice)}</td>
                                                <td>
                                                    <span className={`fw-bold ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'
                                                        }`}>
                                                        {formatPrice(transaction.totalPrice)}
                                                    </span>
                                                </td>
                                                <td>
                                                    {transaction.details ? (
                                                        <span className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                                            {transaction.details}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted fst-italic">Sin detalles</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="btn-group btn-group-sm">
                                                        <button
                                                            className="btn btn-outline-primary"
                                                            onClick={() => handleEdit(transaction)}
                                                            title="Editar"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger"
                                                            onClick={() => handleDelete(transaction)}
                                                            title="Eliminar"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-exchange-alt fa-3x text-muted mb-3"></i>
                                <h5>No hay transacciones registradas</h5>
                                <p className="text-muted mb-3">Comienza registrando tu primera transacción</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowForm(true)}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Nueva Transacción
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Paginación */}
            {transactions.length > 0 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                        hasNextPage={pagination.hasNextPage}
                        hasPreviousPage={pagination.hasPreviousPage}
                    />
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;