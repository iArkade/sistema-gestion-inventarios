import React, { useState, useEffect } from 'react';
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

    // Filtros
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [transactionType, setTransactionType] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [hasNextPage, setHasNextPage] = useState<boolean>(false);
    const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);

    // Estadísticas
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
    }, [selectedProductId, dateFrom, dateTo, transactionType, search, currentPage, pageSize]);

    const loadProducts = async (): Promise<void> => {
        try {
            const result = await productApi.getAll({ pageSize: 1000 });
            setProducts(result.data);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            NotificationService.show('Error al cargar los productos', 'danger');
        }
    };

    const loadTransactions = async (): Promise<void> => {
        if (!selectedProductId) return;

        setLoading(true);
        try {
            const productId = parseInt(selectedProductId);
            const productResult = await productApi.getById(productId);
            setSelectedProduct(productResult);

            // Cargar transacciones con filtros
            const filters: FilterParameters = {
                productId: productId,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                transactionType: transactionType || undefined,
                search: search || undefined,
                page: currentPage,
                pageSize,
                sortBy: 'date',
                sortDirection: 'desc'
            };

            const result = await transactionApi.getAll(filters);
            setTransactions(result.data);
            setTotalPages(result.totalPages);
            setTotalRecords(result.totalRecords);
            setHasNextPage(result.hasNextPage);
            setHasPreviousPage(result.hasPreviousPage);

            // Calcular estadísticas
            calculateStats(result.data);
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
            NotificationService.show('Error al cargar las transacciones', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (transactionList: Transaction[]): void => {
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
    };

    const resetStats = (): void => {
        setStats({
            totalTransactions: 0,
            totalPurchases: 0,
            totalSales: 0,
            totalPurchaseAmount: 0,
            totalSaleAmount: 0
        });
    };

    const handleProductChange = (productId: string): void => {
        setSelectedProductId(productId);
        setCurrentPage(1);
        setTransactions([]);
        resetStats();

        if (productId) {
            const product = products.find(p => p.id.toString() === productId);
            NotificationService.show(`Cargando historial de ${product?.name || 'producto seleccionado'}`, 'info');
        }
    };

    const handlePageChange = (page: number): void => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (newPageSize: number): void => {
        setPageSize(newPageSize);
        setCurrentPage(1);
    };

    const clearFilters = (): void => {
        setDateFrom('');
        setDateTo('');
        setTransactionType('');
        setSearch('');
        setCurrentPage(1);
        NotificationService.show('Filtros limpiados', 'info');
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const getProductStockBadge = (stock: number) => {
        if (stock === 0) return { class: 'bg-danger', text: 'Sin Stock', icon: 'fa-times-circle' };
        if (stock < 10) return { class: 'bg-warning', text: 'Stock Bajo', icon: 'fa-exclamation-triangle' };
        return { class: 'bg-success', text: 'Disponible', icon: 'fa-check-circle' };
    };

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
                                    background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                                }}
                            >
                                <i className="fas fa-chart-bar fa-lg text-white"></i>
                            </div>
                        </div>
                        <div>
                            <h1 className="mb-1 fw-bold text-gradient">Reportes y Análisis</h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selección de Producto Mejorada */}
            <div className="card mb-4 hover-lift">
                <div className="card-header">
                    <h5 className="mb-0 fw-bold">
                        <i className="fas fa-search me-2 text-primary"></i>
                        Seleccionar Producto para Análisis
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row g-4">
                        <div className="col-md-8">
                            <label className="form-label">
                                <i className="fas fa-box me-1"></i>
                                Producto a Analizar
                            </label>
                            <select
                                className="form-select form-select-lg"
                                value={selectedProductId}
                                onChange={(e) => handleProductChange(e.target.value)}
                            >
                                <option value="">🔍 Seleccionar producto para ver su historial completo</option>
                                {products.map(product => {
                                    return (
                                        <option key={product.id} value={product.id.toString()}>
                                            📦 {product.name} •
                                            📊 Stock: {product.stock} •
                                            💰 {formatPrice(product.price)} •
                                            🏷️ {product.category}
                                        </option>
                                    );
                                })}
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
                                            <strong>📦 Nombre:</strong>
                                            <br />
                                            <span className="text-dark">{selectedProduct.name}</span>
                                        </div>
                                        <div className="mb-2">
                                            <strong>📊 Stock:</strong>
                                            <br />
                                            <span className={`badge ${getProductStockBadge(selectedProduct.stock).class}`}>
                                                <i className={`fas ${getProductStockBadge(selectedProduct.stock).icon} me-1`}></i>
                                                {selectedProduct.stock} unidades
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <strong>💰 Precio:</strong>
                                            <br />
                                            <span className="fw-bold text-success">{formatPrice(selectedProduct.price)}</span>
                                        </div>
                                        <div>
                                            <strong>🏷️ Categoría:</strong>
                                            <br />
                                            <span className="badge bg-info">{selectedProduct.category}</span>
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
                    {/* Filtros Avanzados */}
                    <div className="card mb-4 hover-lift">
                        <div className="card-header">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 fw-bold">
                                    <i className="fas fa-filter me-2 text-primary"></i>
                                    Filtros de Transacciones
                                </h5>
                                {transactions.length > 0 && (
                                    <small className="text-muted">
                                        Mostrando {transactions.length} de {totalRecords} transacciones
                                    </small>
                                )}
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label">
                                        <i className="fas fa-search me-1"></i>
                                        Buscar en Detalles
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Buscar en detalles..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">
                                        <i className="fas fa-tag me-1"></i>
                                        Tipo de Transacción
                                    </label>
                                    <select
                                        className="form-select"
                                        value={transactionType}
                                        onChange={(e) => setTransactionType(e.target.value)}
                                    >
                                        <option value="">Todos los tipos</option>
                                        <option value="Purchase">🔻 Solo Compras</option>
                                        <option value="Sale">🔺 Solo Ventas</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">
                                        <i className="fas fa-calendar me-1"></i>
                                        Fecha Desde
                                    </label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">
                                        <i className="fas fa-calendar-alt me-1"></i>
                                        Fecha Hasta
                                    </label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="row mt-3 align-items-end">
                                <div className="col-md-6">
                                    <button
                                        className="btn btn-outline-secondary hover-lift"
                                        onClick={clearFilters}
                                    >
                                        <i className="fas fa-eraser me-2"></i>
                                        Limpiar Filtros
                                    </button>
                                </div>
                                <div className="col-md-6 text-end">
                                    <div className="d-flex align-items-center justify-content-end">
                                        <label className="form-label me-2 mb-0">
                                            <i className="fas fa-list me-1"></i>
                                            Registros por página:
                                        </label>
                                        <select
                                            className="form-select w-auto"
                                            value={pageSize}
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

                    {/* Estadísticas Mejoradas */}
                    {transactions.length > 0 && (
                        <div className="row mb-4">
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="card h-100 text-center hover-lift">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <i className="fas fa-list fa-2x text-primary"></i>
                                        </div>
                                        <h4 className="fw-bold text-primary">{stats.totalTransactions}</h4>
                                        <small className="text-muted">Total Transacciones</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="card h-100 text-center hover-lift">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <i className="fas fa-arrow-down fa-2x text-success"></i>
                                        </div>
                                        <h4 className="fw-bold text-success">{stats.totalPurchases}</h4>
                                        <small className="text-muted">Compras</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-2 col-md-4 mb-3">
                                <div className="card h-100 text-center hover-lift">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <i className="fas fa-arrow-up fa-2x text-danger"></i>
                                        </div>
                                        <h4 className="fw-bold text-danger">{stats.totalSales}</h4>
                                        <small className="text-muted">Ventas</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-3">
                                <div className="card h-100 text-center hover-lift">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <i className="fas fa-shopping-cart fa-2x text-success"></i>
                                        </div>
                                        <h5 className="fw-bold text-success">{formatPrice(stats.totalPurchaseAmount)}</h5>
                                        <small className="text-muted">Total en Compras</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 mb-3">
                                <div className="card h-100 text-center hover-lift">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <i className="fas fa-cash-register fa-2x text-danger"></i>
                                        </div>
                                        <h5 className="fw-bold text-danger">{formatPrice(stats.totalSaleAmount)}</h5>
                                        <small className="text-muted">Total en Ventas</small>
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
                        <div className="card hover-lift">
                            <div className="card-header">
                                <div className="d-flex align-items-center justify-content-between">
                                    <h5 className="mb-0 fw-bold">
                                        <i className="fas fa-history me-2 text-primary"></i>
                                        Historial de Transacciones
                                        {selectedProduct && (
                                            <span className="ms-2 text-muted">- {selectedProduct.name}</span>
                                        )}
                                    </h5>
                                    {transactions.length > 0 && (
                                        <div className="d-flex gap-2">
                                            <span className="badge bg-info">
                                                {transactions.length} transacciones
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {transactions.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table mb-0">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        <i className="fas fa-calendar me-2"></i>
                                                        Fecha y Hora
                                                    </th>
                                                    <th>
                                                        <i className="fas fa-tag me-2"></i>
                                                        Tipo
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
                                                        <i className="fas fa-cubes me-2"></i>
                                                        Stock Actual
                                                    </th>
                                                    <th>
                                                        <i className="fas fa-comment me-2"></i>
                                                        Detalles
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((transaction) => (
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
                                                                <em className="text-muted">Sin detalles</em>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="empty-state">
                                            <i className="fas fa-search"></i>
                                            <h5>No se encontraron transacciones</h5>
                                            <p>
                                                {selectedProductId
                                                    ? 'No hay transacciones para este producto con los filtros aplicados.'
                                                    : 'Seleccione un producto para ver su historial de transacciones.'}
                                            </p>
                                            {selectedProductId && (dateFrom || dateTo || transactionType || search) && (
                                                <button
                                                    className="btn btn-primary mt-2"
                                                    onClick={clearFilters}
                                                >
                                                    <i className="fas fa-eraser me-2"></i>
                                                    Limpiar Filtros
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                </>
            )}
        </div>
    );
};

export default FiltersPage;