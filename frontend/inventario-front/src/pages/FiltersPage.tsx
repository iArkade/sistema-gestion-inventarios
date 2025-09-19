import React, { useState, useEffect, useCallback } from 'react';
import { productApi, transactionApi, NotificationService } from '../services/api';
import type {
    Product,
    Transaction,
    FilterParameters,
    TransactionStats
} from '../types';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const FiltersPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        transactionType: '',
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

    const [stats, setStats] = useState<TransactionStats>({
        totalTransactions: 0,
        totalPurchases: 0,
        totalSales: 0,
        totalPurchaseAmount: 0,
        totalSaleAmount: 0
    });

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (selectedProductId) {
            loadTransactions();
        } else {
            setTransactions([]);
            setSelectedProduct(null);
            resetStats();
        }
    }, [selectedProductId, filters, pagination.currentPage, pagination.pageSize]);

    const loadProducts = useCallback(async (): Promise<void> => {
        try {
            const result = await productApi.getAll({ pageSize: 1000 });
            setProducts(result.data);
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }, []);

    const loadTransactions = useCallback(async (): Promise<void> => {
        if (!selectedProductId) return;

        setLoading(true);
        try {
            const productId = parseInt(selectedProductId);

            const productResult = await productApi.getById(productId);
            setSelectedProduct(productResult);
            const filterParams: FilterParameters = {
                productId: productId,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
                transactionType: filters.transactionType || undefined,
                search: filters.search || undefined,
                page: pagination.currentPage,
                pageSize: pagination.pageSize,
                sortBy: 'date',
                sortDirection: 'desc'
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

            calculateStats(result.data);
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedProductId, filters, pagination.currentPage, pagination.pageSize]);

    const calculateStats = useCallback((transactionList: Transaction[]): void => {
        const purchases = transactionList.filter(t => t.transactionType === 'Purchase');
        const sales = transactionList.filter(t => t.transactionType === 'Sale');

        const totalPurchaseAmount = purchases.reduce((sum, t) => sum + t.totalPrice, 0);
        const totalSaleAmount = sales.reduce((sum, t) => sum + t.totalPrice, 0);

        setStats({
            totalTransactions: transactionList.length,
            totalPurchases: purchases.length,
            totalSales: sales.length,
            totalPurchaseAmount,
            totalSaleAmount
        });
    }, []);

    const resetStats = useCallback((): void => {
        setStats({
            totalTransactions: 0,
            totalPurchases: 0,
            totalSales: 0,
            totalPurchaseAmount: 0,
            totalSaleAmount: 0
        });
    }, []);

    const handleProductChange = (productId: string): void => {
        setSelectedProductId(productId);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        setTransactions([]);
        resetStats();

        if (productId) {
            const product = products.find(p => p.id.toString() === productId);
            NotificationService.show(`Cargando historial de ${product?.name || 'producto seleccionado'}`, 'info');
        }
    };

    const handleFilterChange = (newFilters: Partial<typeof filters>): void => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (page: number): void => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    };

    const handlePageSizeChange = (newPageSize: number): void => {
        setPagination(prev => ({ ...prev, pageSize: newPageSize, currentPage: 1 }));
    };

    const clearFilters = (): void => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            transactionType: '',
            search: ''
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        NotificationService.show('Filtros limpiados', 'info');
    };

    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getProductStockBadge = (stock: number) => {
        if (stock === 0) return { class: 'bg-danger', text: 'Sin Stock', icon: 'fa-times-circle' };
        if (stock < 10) return { class: 'bg-warning text-dark', text: 'Stock Bajo', icon: 'fa-exclamation-triangle' };
        return { class: 'bg-success', text: 'Disponible', icon: 'fa-check-circle' };
    };

    return (
        <div className="container-fluid py-4">
            {/* Header Profesional */}
            <div className="row align-items-center mb-4">
                <div className="col">
                    <div className="d-flex align-items-center">
                        <div className="icon-box bg-warning me-3">
                            <i className="fas fa-chart-bar"></i>
                        </div>
                        <div>
                            <h1 className="h3 mb-0 fw-bold">Reportes y Análisis</h1>
                            <p className="text-muted mb-0">Analiza el historial de transacciones por producto</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selección de Producto */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="card-title mb-0">
                        <i className="fas fa-search me-2"></i>
                        Seleccionar Producto para Análisis
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row g-4">
                        <div className="col-md-8">
                            <label className="form-label">Producto a Analizar</label>
                            <select
                                className="form-select form-select-lg"
                                value={selectedProductId}
                                onChange={(e) => handleProductChange(e.target.value)}
                            >
                                <option value="">Seleccionar producto para ver su historial completo</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id.toString()}>
                                        {product.name} • Stock: {product.stock} • {formatPrice(product.price)} • {product.category}
                                    </option>
                                ))}
                            </select>
                            <small className="text-muted mt-2 d-block">
                                Selecciona un producto para ver su historial completo de transacciones
                            </small>
                        </div>
                        <div className="col-md-4">
                            {selectedProduct ? (
                                <div className="card bg-light border-0">
                                    <div className="card-body">
                                        <h6 className="card-title fw-bold text-primary">
                                            <i className="fas fa-info-circle me-2"></i>
                                            Información del Producto
                                        </h6>
                                        <div className="mb-2">
                                            <strong>Nombre:</strong> {selectedProduct.name}
                                        </div>
                                        <div className="mb-2">
                                            <strong>Stock:</strong>
                                            <span className={`badge ms-2 ${getProductStockBadge(selectedProduct.stock).class}`}>
                                                <i className={`fas ${getProductStockBadge(selectedProduct.stock).icon} me-1`}></i>
                                                {selectedProduct.stock} unidades
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <strong>Precio:</strong> {formatPrice(selectedProduct.price)}
                                        </div>
                                        <div>
                                            <strong>Categoría:</strong>
                                            <span className="badge bg-info ms-2">{selectedProduct.category}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-4">
                                    <i className="fas fa-arrow-left fa-2x mb-3 opacity-50"></i>
                                    <p className="mb-0">
                                        Selecciona un producto para ver su información detallada
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectedProductId && (
                <>
                    {/* Filtros de Transacciones */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="card-title mb-0">
                                    <i className="fas fa-filter me-2"></i>
                                    Filtros de Transacciones
                                </h5>
                                {transactions.length > 0 && (
                                    <small className="text-muted">
                                        Mostrando {transactions.length} de {pagination.totalRecords} transacciones
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">Buscar en Detalles</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Buscar en detalles..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange({ search: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Tipo de Transacción</label>
                                    <select
                                        className="form-select"
                                        value={filters.transactionType}
                                        onChange={(e) => handleFilterChange({ transactionType: e.target.value })}
                                    >
                                        <option value="">Todos los tipos</option>
                                        <option value="Purchase">Solo Compras</option>
                                        <option value="Sale">Solo Ventas</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Fecha Desde</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filters.dateFrom}
                                        onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Fecha Hasta</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={filters.dateTo}
                                        onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="row mt-3 align-items-end">
                                <div className="col-md-6">
                                    <button className="btn btn-outline-secondary" onClick={clearFilters}>
                                        <i className="fas fa-times me-2"></i>
                                        Limpiar Filtros
                                    </button>
                                </div>
                                <div className="col-md-6 text-end">
                                    <div className="d-flex align-items-center justify-content-end">
                                        <label className="form-label me-2 mb-0">Registros por página:</label>
                                        <select
                                            className="form-select w-auto"
                                            value={pagination.pageSize}
                                            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                                        >
                                            <option value="10">10</option>
                                            <option value="25">25</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    {transactions.length > 0 && (
                        <div className="row mb-4">
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="stats-card">
                                    <div className="stats-icon bg-primary">
                                        <i className="fas fa-list"></i>
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-number">{stats.totalTransactions}</h3>
                                        <p className="stats-label">Total Transacciones</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="stats-card">
                                    <div className="stats-icon bg-success">
                                        <i className="fas fa-arrow-down"></i>
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-number">{stats.totalPurchases}</h3>
                                        <p className="stats-label">Compras</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="stats-card">
                                    <div className="stats-icon bg-danger">
                                        <i className="fas fa-arrow-up"></i>
                                    </div>
                                    <div className="stats-content">
                                        <h3 className="stats-number">{stats.totalSales}</h3>
                                        <p className="stats-label">Ventas</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-3">
                                <div className="stats-card">
                                    <div className="stats-icon bg-success">
                                        <i className="fas fa-shopping-cart"></i>
                                    </div>
                                    <div className="stats-content">
                                        <h4 className="stats-number">{formatPrice(stats.totalPurchaseAmount)}</h4>
                                        <p className="stats-label">Total en Compras</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-3">
                                <div className="stats-card">
                                    <div className="stats-icon bg-danger">
                                        <i className="fas fa-cash-register"></i>
                                    </div>
                                    <div className="stats-content">
                                        <h4 className="stats-number">{formatPrice(stats.totalSaleAmount)}</h4>
                                        <p className="stats-label">Total en Ventas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Historial de Transacciones */}
                    {loading ? (
                        <div className="card">
                            <div className="card-body">
                                <LoadingSpinner />
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header">
                                <div className="d-flex align-items-center justify-content-between">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-history me-2"></i>
                                        Historial de Transacciones
                                        {selectedProduct && (
                                            <span className="ms-2 text-muted">- {selectedProduct.name}</span>
                                        )}
                                    </h5>
                                    {transactions.length > 0 && (
                                        <span className="badge bg-info">
                                            {transactions.length} transacciones
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {transactions.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Fecha y Hora</th>
                                                    <th>Tipo</th>
                                                    <th>Cantidad</th>
                                                    <th>P. Unitario</th>
                                                    <th>Total</th>
                                                    <th>Stock Actual</th>
                                                    <th>Detalles</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((transaction) => (
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
                                                            <span className={`badge ${transaction.transactionType === 'Purchase' ? 'bg-success' : 'bg-danger'}`}>
                                                                <i className={`fas ${transaction.transactionType === 'Purchase' ? 'fa-arrow-down' : 'fa-arrow-up'} me-1`}></i>
                                                                {transaction.transactionType === 'Purchase' ? 'Compra' : 'Venta'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`fw-bold ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'}`}>
                                                                {transaction.transactionType === 'Purchase' ? '+' : '-'}{transaction.quantity}
                                                            </span>
                                                            <small className="text-muted d-block">unidades</small>
                                                        </td>
                                                        <td className="fw-semibold">{formatPrice(transaction.unitPrice)}</td>
                                                        <td>
                                                            <span className={`fw-bold ${transaction.transactionType === 'Purchase' ? 'text-success' : 'text-danger'}`}>
                                                                {formatPrice(transaction.totalPrice)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {selectedProduct && (
                                                                <span className={`badge ${getProductStockBadge(selectedProduct.stock).class}`}>
                                                                    <i className={`fas ${getProductStockBadge(selectedProduct.stock).icon} me-1`}></i>
                                                                    {selectedProduct.stock}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {transaction.details ? (
                                                                <span
                                                                    title={transaction.details}
                                                                    className="text-truncate d-inline-block"
                                                                    style={{ maxWidth: '200px' }}
                                                                >
                                                                    {transaction.details}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted fst-italic">Sin detalles</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <i className="fas fa-search fa-3x text-muted mb-3"></i>
                                        <h5>No se encontraron transacciones</h5>
                                        <p className="text-muted mb-3">
                                            {selectedProductId
                                                ? 'No hay transacciones para este producto con los filtros aplicados.'
                                                : 'Seleccione un producto para ver su historial de transacciones.'}
                                        </p>
                                        {selectedProductId && (filters.dateFrom || filters.dateTo || filters.transactionType || filters.search) && (
                                            <button className="btn btn-primary" onClick={clearFilters}>
                                                <i className="fas fa-times me-2"></i>
                                                Limpiar Filtros
                                            </button>
                                        )}
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
                </>
            )}
        </div>
    );
};

export default FiltersPage;