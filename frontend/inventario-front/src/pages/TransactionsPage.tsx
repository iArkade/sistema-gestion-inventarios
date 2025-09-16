import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
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

    // Filtros
    const [productFilter, setProductFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [hasNextPage, setHasNextPage] = useState<boolean>(false);
    const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);

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
    }, [productFilter, typeFilter, dateFrom, dateTo, search, sortBy, sortDirection, currentPage, pageSize]);

    const loadTransactions = async (): Promise<void> => {
        setLoading(true);
        try {
            const filters: FilterParameters = {
                productId: productFilter ? parseInt(productFilter) : undefined,
                transactionType: typeFilter || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                search: search || undefined,
                sortBy,
                sortDirection,
                page: currentPage,
                pageSize
            };

            const result = await transactionApi.getAll(filters);
            setTransactions(result.data);
            setTotalPages(result.totalPages);
            setTotalRecords(result.totalRecords);
            setHasNextPage(result.hasNextPage);
            setHasPreviousPage(result.hasPreviousPage);
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
            NotificationService.show('Error al cargar las transacciones', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async (): Promise<void> => {
        try {
            const result = await transactionApi.getProducts();
            setProducts(result);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            NotificationService.show('Error al cargar los productos', 'warning');
        }
    };

    const validateForm = (): boolean => {
        const errors: FormErrors = {};

        if (!formData.transactionType) {
            errors.transactionType = 'El tipo de transacción es obligatorio';
        }

        if (!formData.productId || formData.productId === 0) {
            errors.productId = 'Debe seleccionar un producto';
        }

        if (formData.quantity <= 0) {
            errors.quantity = 'La cantidad debe ser mayor a 0';
        }

        if (formData.unitPrice <= 0) {
            errors.unitPrice = 'El precio unitario debe ser mayor a 0';
        }

        // Validar stock para ventas
        if (formData.transactionType === 'Sale' && selectedProduct) {
            if (formData.quantity > selectedProduct.stock) {
                errors.quantity = `Stock insuficiente. Disponible: ${selectedProduct.stock}`;
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!validateForm()) {
            NotificationService.show('Por favor corrige los errores en el formulario', 'warning');
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
                NotificationService.show('Transacción actualizada exitosamente', 'success');
            } else {
                await transactionApi.create(formData);
                NotificationService.show('Transacción creada exitosamente', 'success');
            }

            handleCloseForm();
            await loadTransactions();
            await loadProducts();
        } catch (error) {
            console.error('Error al guardar transacción:', error);
            NotificationService.show('Error al guardar la transacción', 'danger');
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

        const product = products.find(p => p.id === transaction.productId);
        setSelectedProduct(product || null);
        setFormErrors({});
        setShowForm(true);
    };

    const handleDelete = async (transaction: Transaction): Promise<void> => {
        const confirmed = window.confirm(
            `¿Estás seguro de que deseas eliminar esta transacción?\n\n` +
            `📋 Tipo: ${transaction.transactionType === 'Purchase' ? 'Compra' : 'Venta'}\n` +
            `📦 Producto: ${transaction.productName}\n` +
            `📊 Cantidad: ${transaction.quantity} unidades\n` +
            `💰 Total: $${transaction.totalPrice.toFixed(2)}\n` +
            `📅 Fecha: ${new Date(transaction.transactionDate).toLocaleString()}\n\n` +
            `⚠️ Esta acción no se puede deshacer y afectará el stock del producto.`
        );

        if (confirmed) {
            try {
                await transactionApi.delete(transaction.id);
                NotificationService.show('Transacción eliminada exitosamente', 'success');
                await loadTransactions();
                await loadProducts();
            } catch (error) {
                console.error('Error al eliminar transacción:', error);
                NotificationService.show('Error al eliminar la transacción', 'danger');
            }
        }
    };

    const handleProductChange = (productIdString: string): void => {
        const productId = productIdString ? parseInt(productIdString) : 0;
        const product = products.find(p => p.id === productId);
        setSelectedProduct(product || null);
        setFormData(prev => ({
            ...prev,
            productId: productId,
            unitPrice: product ? product.price : 0
        }));

        // Limpiar error específico
        if (formErrors.productId) {
            setFormErrors(prev => {
                const { productId, ...rest } = prev;
                return rest;
            });
        }
    };

    const handleCloseForm = (): void => {
        setShowForm(false);
        setEditingTransaction(null);
        setFormData({ transactionType: 'Purchase', productId: 0, quantity: 1, unitPrice: 0, details: '' });
        setSelectedProduct(null);
        setFormErrors({});
    };

    const handlePageChange = (page: number): void => {
        setCurrentPage(page);
    };

    const handleFilterChange = (): void => {
        setCurrentPage(1);
    };

    const clearFilters = (): void => {
        setProductFilter('');
        setTypeFilter('');
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setSortBy('date');
        setSortDirection('desc');
        setCurrentPage(1);
        NotificationService.show('Filtros limpiados', 'info');
    };

    const getTotalPrice = (): string => {
        return (formData.quantity * formData.unitPrice).toFixed(2);
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

        // Limpiar error específico al escribir
        if (formErrors[name]) {
            setFormErrors(prev => {
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    // Calcular estadísticas rápidas
    const totalPurchases = transactions.filter(t => t.transactionType === 'Purchase').length;
    const totalSales = transactions.filter(t => t.transactionType === 'Sale').length;
    const totalPurchaseAmount = transactions
        .filter(t => t.transactionType === 'Purchase')
        .reduce((sum, t) => sum + t.totalPrice, 0);
    const totalSaleAmount = transactions
        .filter(t => t.transactionType === 'Sale')
        .reduce((sum, t) => sum + t.totalPrice, 0);

    return (
        <div className="fade-in-up">
            {/* Header Mejorado */}
            <div className="row align-items-center mb-4">
                <div className="col-md-8">
                    <div className="d-flex align-items-center">
                        <div className="me-3">
                            <div
                                className="d-flex align-items-center justify-content-center"
                                style={{
                                    width: '60px',
                                    height: '60px',
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                                }}
                            >
                                <i className="fas fa-exchange-alt fa-lg text-white"></i>
                            </div>
                        </div>
                        <div>
                            <h1 className="mb-1 fw-bold text-gradient">Gestión de Transacciones</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 text-end">
                    <button
                        className="btn btn-primary btn-lg hover-lift"
                        onClick={() => {
                            setShowForm(true);
                            setEditingTransaction(null);
                            setFormData({ transactionType: 'Purchase', productId: 0, quantity: 1, unitPrice: 0, details: '' });
                            setSelectedProduct(null);
                            setFormErrors({});
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        <span>Nueva Transacción</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="row mb-4">
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-exchange-alt fa-2x text-primary"></i>
                            </div>
                            <h4 className="fw-bold text-primary">{transactions.length}</h4>
                            <small className="text-muted">Total Transacciones</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-arrow-down fa-2x text-success"></i>
                            </div>
                            <h4 className="fw-bold text-success">{totalPurchases}</h4>
                            <small className="text-muted">Compras</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-arrow-up fa-2x text-danger"></i>
                            </div>
                            <h4 className="fw-bold text-danger">{totalSales}</h4>
                            <small className="text-muted">Ventas</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-balance-scale fa-2x text-info"></i>
                            </div>
                            <h4 className="fw-bold text-info">
                                {formatPrice(totalSaleAmount - totalPurchaseAmount)}
                            </h4>
                            <small className="text-muted">Utilidad Bruta</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros Mejorados */}
            <div className="card mb-4 hover-lift">
                <div className="card-header">
                    <div className="d-flex align-items-center justify-content-between">
                        <h5 className="mb-0 fw-bold">
                            <i className="fas fa-filter me-2 text-primary"></i>
                            Filtros de Búsqueda
                        </h5>
                        <small className="text-muted">
                            Mostrando {transactions.length} de {totalRecords} transacciones
                        </small>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-2">
                            <label className="form-label">
                                <i className="fas fa-search me-1"></i>
                                Buscar
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Producto o detalles..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange();
                                }}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">
                                <i className="fas fa-box me-1"></i>
                                Producto
                            </label>
                            <select
                                className="form-select"
                                value={productFilter}
                                onChange={(e) => {
                                    setProductFilter(e.target.value);
                                    handleFilterChange();
                                }}
                            >
                                <option value="">Todos los productos</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id.toString()}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">
                                <i className="fas fa-tag me-1"></i>
                                Tipo
                            </label>
                            <select
                                className="form-select"
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    handleFilterChange();
                                }}
                            >
                                <option value="">Todos los tipos</option>
                                <option value="Purchase">🔻 Compra</option>
                                <option value="Sale">🔺 Venta</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Fecha desde</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    handleFilterChange();
                                }}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Fecha hasta</label>
                            <input
                                type="date"
                                className="form-control"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    handleFilterChange();
                                }}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Por página</label>
                            <select
                                className="form-select"
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col">
                            <button
                                className="btn btn-outline-secondary hover-lift"
                                onClick={clearFilters}
                            >
                                <i className="fas fa-eraser me-2"></i>
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Formulario */}
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
                                                <i className="fas fa-exchange-alt me-1"></i>
                                                Tipo de Transacción
                                                <span className="text-danger">*</span>
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
                                            {formErrors.transactionType && <div className="invalid-feedback">{formErrors.transactionType}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                <i className="fas fa-box me-1"></i>
                                                Producto
                                                <span className="text-danger">*</span>
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
                                            {formErrors.productId && <div className="invalid-feedback">{formErrors.productId}</div>}
                                        </div>
                                    </div>

                                    {selectedProduct && (
                                        <div className="alert alert-info mt-3">
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <strong>
                                                        <i className="fas fa-box me-1"></i>
                                                        Producto seleccionado:
                                                    </strong> {selectedProduct.name}
                                                    <br />
                                                    <strong>
                                                        <i className="fas fa-cubes me-1"></i>
                                                        Stock disponible:
                                                    </strong> {selectedProduct.stock} unidades
                                                </div>
                                                <div className="col-md-6">
                                                    <strong>
                                                        <i className="fas fa-dollar-sign me-1"></i>
                                                        Precio sugerido:
                                                    </strong> {formatPrice(selectedProduct.price)}
                                                    <br />
                                                    <strong>
                                                        <i className="fas fa-tag me-1"></i>
                                                        Categoría:
                                                    </strong> {selectedProduct.category}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="row g-3 mt-2">
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                <i className="fas fa-calculator me-1"></i>
                                                Cantidad
                                                <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                className={`form-control ${formErrors.quantity ? 'is-invalid' : ''}`}
                                                value={formData.quantity}
                                                onChange={handleInputChange}
                                                min="1"
                                                placeholder="0"
                                                required
                                            />
                                            {formErrors.quantity && <div className="invalid-feedback">{formErrors.quantity}</div>}
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                <i className="fas fa-dollar-sign me-1"></i>
                                                Precio Unitario
                                                <span className="text-danger">*</span>
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
                                                    placeholder="0.00"
                                                    required
                                                />
                                                {formErrors.unitPrice && <div className="invalid-feedback">{formErrors.unitPrice}</div>}
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">
                                                <i className="fas fa-receipt me-1"></i>
                                                Total
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">$</span>
                                                <input
                                                    type="text"
                                                    className="form-control fw-bold"
                                                    value={getTotalPrice()}
                                                    readOnly
                                                    style={{ backgroundColor: '#f8f9fa' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label">
                                            <i className="fas fa-comment me-1"></i>
                                            Detalles Adicionales
                                        </label>
                                        <textarea
                                            name="details"
                                            className="form-control"
                                            rows={3}
                                            value={formData.details || ''}
                                            onChange={handleInputChange}
                                            placeholder="Información adicional sobre la transacción (opcional)"
                                        />
                                        <small className="text-muted">
                                            Puedes agregar detalles como proveedor, cliente, notas, etc.
                                        </small>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCloseForm}>
                                        <i className="fas fa-times me-2"></i>
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
                <div className="card hover-lift">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table mb-0">
                                <thead>
                                    <tr>
                                        <th>
                                            <i className="fas fa-calendar me-2"></i>
                                            Fecha
                                        </th>
                                        <th>
                                            <i className="fas fa-tag me-2"></i>
                                            Tipo
                                        </th>
                                        <th>
                                            <i className="fas fa-box me-2"></i>
                                            Producto
                                        </th>
                                        <th>
                                            <i className="fas fa-calculator me-2"></i>
                                            Cantidad
                                        </th>
                                        <th>
                                            <i className="fas fa-dollar-sign me-2"></i>
                                            P. Unitario
                                        </th>
                                        <th>
                                            <i className="fas fa-receipt me-2"></i>
                                            Total
                                        </th>
                                        <th>
                                            <i className="fas fa-comment me-2"></i>
                                            Detalles
                                        </th>
                                        <th style={{ width: '130px' }}>
                                            <i className="fas fa-cogs me-2"></i>
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length > 0 ? (
                                        transactions.map(transaction => (
                                            <tr key={transaction.id}>
                                                <td>
                                                    <div>
                                                        <div className="fw-bold">
                                                            {new Date(transaction.transactionDate).toLocaleDateString('es-ES')}
                                                        </div>
                                                        <small className="text-muted">
                                                            {new Date(transaction.transactionDate).toLocaleTimeString('es-ES')}
                                                        </small>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${transaction.transactionType === 'Purchase' ? 'bg-success' : 'bg-danger'}`}>
                                                        <i className={`fas ${transaction.transactionType === 'Purchase' ? 'fa-arrow-down' : 'fa-arrow-up'} me-1`}></i>
                                                        {transaction.transactionType === 'Purchase' ? 'Compra' : 'Venta'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">{transaction.productName}</div>
                                                </td>
                                                <td>
                                                    <span className={`fw-bold fs-6 ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'}`}>
                                                        {transaction.transactionType === 'Purchase' ? '+' : '-'}{transaction.quantity}
                                                    </span>
                                                    <small className="text-muted d-block">unidades</small>
                                                </td>
                                                <td>
                                                    <span className="fw-bold">{formatPrice(transaction.unitPrice)}</span>
                                                </td>
                                                <td>
                                                    <span className={`fw-bold fs-6 ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'}`}>
                                                        {formatPrice(transaction.totalPrice)}
                                                    </span>
                                                </td>
                                                <td>
                                                    {transaction.details ? (
                                                        <span
                                                            title={transaction.details}
                                                            className="text-truncate d-inline-block"
                                                            style={{ maxWidth: '150px' }}
                                                        >
                                                            {transaction.details.length > 30
                                                                ? transaction.details.substring(0, 30) + '...'
                                                                : transaction.details}
                                                        </span>
                                                    ) : (
                                                        <em className="text-muted">Sin detalles</em>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="btn-group btn-group-sm" role="group">
                                                        <button
                                                            className="btn btn-outline-primary"
                                                            onClick={() => handleEdit(transaction)}
                                                            title={`Editar transacción`}
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger"
                                                            onClick={() => handleDelete(transaction)}
                                                            title={`Eliminar transacción`}
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="text-center py-5">
                                                <div className="empty-state">
                                                    <i className="fas fa-exchange-alt"></i>
                                                    <h5>No hay transacciones registradas</h5>
                                                    <p>Comienza registrando tu primera transacción</p>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setShowForm(true)}
                                                    >
                                                        <i className="fas fa-plus me-2"></i>
                                                        Nueva Transacción
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Paginación */}
            {transactions.length > 0 && (
                <div className="mt-4 d-flex justify-content-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        hasNextPage={hasNextPage}
                        hasPreviousPage={hasPreviousPage}
                    />
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;