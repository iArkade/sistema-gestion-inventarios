import React, { useState, useEffect, useCallback, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { productApi, NotificationService } from '../services/api';
import type { Product, CreateProductRequest, FormErrors, FilterParameters } from '../types';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductRow = React.memo(({
    product,
    onEdit,
    onDelete,
    formatPrice,
    getStockBadge
}: {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
    formatPrice: (price: number) => string;
    getStockBadge: (stock: number) => { class: string; text: string; icon: string };
}) => {
    const stockInfo = getStockBadge(product.stock);

    return (
        <tr>
            <td>
                <div>
                    <div className="fw-semibold">{product.name}</div>
                    {product.description && (
                        <small className="text-muted">
                            {product.description.length > 50
                                ? `${product.description.substring(0, 50)}...`
                                : product.description}
                        </small>
                    )}
                </div>
            </td>
            <td>
                <span className="badge bg-info">{product.category}</span>
            </td>
            <td className="fw-semibold text-success">{formatPrice(product.price)}</td>
            <td>
                <span className="fw-bold fs-5">{product.stock}</span>
                <small className="text-muted d-block">unidades</small>
            </td>
            <td>
                <span className={`badge ${stockInfo.class}`}>
                    <i className={`fas ${stockInfo.icon} me-1`}></i>
                    {stockInfo.text}
                </span>
            </td>
            <td>
                <small className="text-muted">
                    {new Date(product.createdAt).toLocaleDateString('es-ES')}
                </small>
            </td>
            <td>
                <div className="btn-group btn-group-sm">
                    <button
                        className="btn btn-outline-primary"
                        onClick={() => onEdit(product)}
                        title={`Editar ${product.name}`}
                    >
                        <i className="fas fa-edit"></i>
                    </button>
                    <button
                        className="btn btn-outline-danger"
                        onClick={() => onDelete(product)}
                        title={`Eliminar ${product.name}`}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    );
});

const StatsCards = React.memo(({
    totalRecords,
    categoriesCount,
    inStockCount,
    lowStockCount
}: {
    totalRecords: number;
    categoriesCount: number;
    inStockCount: number;
    lowStockCount: number;
}) => (
    <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
                <div className="stats-icon bg-primary">
                    <i className="fas fa-boxes"></i>
                </div>
                <div className="stats-content">
                    <h3 className="stats-number">{totalRecords}</h3>
                    <p className="stats-label">Total Productos</p>
                </div>
            </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
                <div className="stats-icon bg-info">
                    <i className="fas fa-tags"></i>
                </div>
                <div className="stats-content">
                    <h3 className="stats-number">{categoriesCount}</h3>
                    <p className="stats-label">Categorías</p>
                </div>
            </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
                <div className="stats-icon bg-success">
                    <i className="fas fa-check-circle"></i>
                </div>
                <div className="stats-content">
                    <h3 className="stats-number">{inStockCount}</h3>
                    <p className="stats-label">En Stock</p>
                </div>
            </div>
        </div>
        <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
                <div className="stats-icon bg-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="stats-content">
                    <h3 className="stats-number">{lowStockCount}</h3>
                    <p className="stats-label">Stock Bajo</p>
                </div>
            </div>
        </div>
    </div>
));

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [filters, setFilters] = useState({
        search: '',
        category: '',
        sortBy: 'name',
        sortDirection: 'asc' as 'asc' | 'desc'
    });

    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalPages: 1,
        totalRecords: 0,
        hasNextPage: false,
        hasPreviousPage: false
    });

    const [formData, setFormData] = useState<CreateProductRequest>({
        name: '',
        description: '',
        category: '',
        imageUrl: '',
        price: 0,
        stock: 0
    });

    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const formatPrice = useCallback((price: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }, []);

    const getStockBadge = useCallback((stock: number) => {
        if (stock === 0) return { class: 'bg-danger', text: 'Sin Stock', icon: 'fa-times-circle' };
        if (stock < 10) return { class: 'bg-warning text-dark', text: 'Stock Bajo', icon: 'fa-exclamation-triangle' };
        return { class: 'bg-success', text: 'Disponible', icon: 'fa-check-circle' };
    }, []);

    const stats = useMemo(() => ({
        inStockCount: products.filter(p => p.stock > 0).length,
        lowStockCount: products.filter(p => p.stock < 10 && p.stock > 0).length
    }), [products]);

    const loadProducts = useCallback(async (): Promise<void> => {
        setLoading(true);
        try {
            const filterParams: FilterParameters = {
                search: filters.search || undefined,
                category: filters.category || undefined,
                sortBy: filters.sortBy,
                sortDirection: filters.sortDirection,
                page: pagination.currentPage,
                pageSize: pagination.pageSize
            };

            const result = await productApi.getAll(filterParams);
            setProducts(result.data);
            setPagination(prev => ({
                ...prev,
                totalPages: result.totalPages,
                totalRecords: result.totalRecords,
                hasNextPage: result.hasNextPage,
                hasPreviousPage: result.hasPreviousPage
            }));
        } catch (error) {
            console.error('Error al cargar productos:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.currentPage, pagination.pageSize]);

    const loadCategories = useCallback(async (): Promise<void> => {
        try {
            const result = await productApi.getCategories();
            setCategories(result);
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    }, []);

    const handleEdit = useCallback(async (product: Product) => {
        setEditingProduct(product);

        if (categories.length === 0) {
            await loadCategories();
        }

        setFormData({
            name: product.name,
            description: product.description || '',
            category: product.category,
            imageUrl: product.imageUrl || '',
            price: product.price,
            stock: product.stock
        });
        setFormErrors({});
        setShowForm(true);
    }, [categories.length, loadCategories]);

    const handleDelete = useCallback(async (product: Product) => {
        const confirmed = window.confirm(
            `¿Eliminar este producto?\n\n` +
            `📦 ${product.name}\n` +
            `📂 ${product.category}\n` +
            `📊 Stock: ${product.stock} unidades\n` +
            `💰 Precio: ${formatPrice(product.price)}\n\n` +
            `Esta acción no se puede deshacer.`
        );

        if (confirmed) {
            try {
                await productApi.delete(product.id);
                await loadProducts();
                await loadCategories();
            } catch (error) {
                console.error('Error al eliminar producto:', error);
            }
        }
    }, [loadProducts, loadCategories, formatPrice]);

    const validateForm = useCallback((): boolean => {
        const errors: FormErrors = {};

        if (!formData.name.trim()) {
            errors.name = 'El nombre es obligatorio';
        } else if (formData.name.length > 200) {
            errors.name = 'El nombre no puede exceder 200 caracteres';
        }

        if (!formData.category.trim()) {
            errors.category = 'La categoría es obligatoria';
        }

        if (formData.price <= 0) {
            errors.price = 'El precio debe ser mayor a 0';
        }

        if (formData.stock < 0) {
            errors.stock = 'El stock no puede ser negativo';
        }

        if (formData.description && formData.description.length > 500) {
            errors.description = 'La descripción no puede exceder 500 caracteres';
        }

        if (formData.imageUrl && formData.imageUrl.length > 500) {
            errors.imageUrl = 'La URL de imagen no puede exceder 500 caracteres';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            NotificationService.show('Corrige los errores en el formulario', 'warning');
            return;
        }

        try {
            if (editingProduct) {
                await productApi.update(editingProduct.id, formData);
            } else {
                await productApi.create(formData);
            }

            setShowForm(false);
            setEditingProduct(null);
            setFormData({ name: '', description: '', category: '', imageUrl: '', price: 0, stock: 0 });
            setFormErrors({});
            await loadProducts();
            await loadCategories();
        } catch (error) {
            console.error('Error al guardar producto:', error);
        }
    }, [formData, editingProduct, validateForm, loadProducts, loadCategories]);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
        }));

        if (formErrors[name]) {
            setFormErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    }, [formErrors]);

    const handleCloseForm = (): void => {
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', description: '', category: '', imageUrl: '', price: 0, stock: 0 });
        setFormErrors({});
    };

    const clearFilters = (): void => {
        setFilters({
            search: '',
            category: '',
            sortBy: 'name',
            sortDirection: 'asc'
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    return (
        <div className="container-fluid py-4">
            {/* Header Profesional */}
            <div className="row align-items-center mb-4">
                <div className="col">
                    <div className="d-flex align-items-center">
                        <div className="icon-box bg-primary me-3">
                            <i className="fas fa-boxes"></i>
                        </div>
                        <div>
                            <h1 className="h3 mb-0 fw-bold">Gestión de Productos</h1>
                            <p className="text-muted mb-0">Administra tu inventario de productos</p>
                        </div>
                    </div>
                </div>
                <div className="col-auto">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => {
                            setShowForm(true);
                            setEditingProduct(null);
                            setFormData({ name: '', description: '', category: '', imageUrl: '', price: 0, stock: 0 });
                            setFormErrors({});
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Estadísticas */}
            <StatsCards
                totalRecords={pagination.totalRecords}
                categoriesCount={categories.length}
                inStockCount={stats.inStockCount}
                lowStockCount={stats.lowStockCount}
            />

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
                        <div className="col-md-4">
                            <label className="form-label">Buscar Producto</label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nombre o descripción..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange({ search: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Categoría</label>
                            <select
                                className="form-select"
                                value={filters.category}
                                onChange={(e) => handleFilterChange({ category: e.target.value })}
                            >
                                <option value="">Todas</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Ordenar por</label>
                            <select
                                className="form-select"
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                            >
                                <option value="name">Nombre</option>
                                <option value="price">Precio</option>
                                <option value="stock">Stock</option>
                                <option value="category">Categoría</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Dirección</label>
                            <select
                                className="form-select"
                                value={filters.sortDirection}
                                onChange={(e) => handleFilterChange({ sortDirection: e.target.value as 'asc' | 'desc' })}
                            >
                                <option value="asc">Ascendente</option>
                                <option value="desc">Descendente</option>
                            </select>
                        </div>
                        <div className="col-md-1">
                            <label className="form-label">Por página</label>
                            <select
                                className="form-select"
                                value={pagination.pageSize}
                                onChange={(e) => {
                                    setPagination(prev => ({
                                        ...prev,
                                        pageSize: parseInt(e.target.value),
                                        currentPage: 1
                                    }));
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
                                    <i className={`fas ${editingProduct ? 'fa-edit text-warning' : 'fa-plus text-success'} me-2`}></i>
                                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                                </h5>
                                <button className="btn-close" onClick={handleCloseForm}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Nombre del Producto <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Ingresa el nombre del producto"
                                                maxLength={200}
                                                required
                                            />
                                            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Categoría <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="category"
                                                className={`form-control ${formErrors.category ? 'is-invalid' : ''}`}
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                placeholder="Escribe o selecciona una categoría"
                                                list="categories-datalist"
                                                required
                                            />
                                            <datalist id="categories-datalist">
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat} />
                                                ))}
                                                <option value="Electrónicos" />
                                                <option value="Ropa" />
                                                <option value="Libros" />
                                                <option value="Hogar" />
                                                <option value="Deportes" />
                                                <option value="Salud" />
                                                <option value="Herramientas" />
                                                <option value="Juguetes" />
                                            </datalist>
                                            {formErrors.category && <div className="invalid-feedback">{formErrors.category}</div>}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label">Descripción</label>
                                        <textarea
                                            name="description"
                                            className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                                            rows={3}
                                            value={formData.description || ''}
                                            onChange={handleInputChange}
                                            placeholder="Describe el producto (opcional)"
                                            maxLength={500}
                                        />
                                        {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                                        <small className="text-muted">
                                            {(formData.description?.length || 0)}/500 caracteres
                                        </small>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label">URL de Imagen</label>
                                        <input
                                            type="url"
                                            name="imageUrl"
                                            className={`form-control ${formErrors.imageUrl ? 'is-invalid' : ''}`}
                                            value={formData.imageUrl || ''}
                                            onChange={handleInputChange}
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                            maxLength={500}
                                        />
                                        {formErrors.imageUrl && <div className="invalid-feedback">{formErrors.imageUrl}</div>}
                                    </div>

                                    <div className="row g-3 mt-2">
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Precio <span className="text-danger">*</span>
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">$</span>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    step="0.01"
                                                    min="0.01"
                                                    className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                                                    value={formData.price || ''}
                                                    onChange={handleInputChange}
                                                    placeholder="0.00"
                                                    required
                                                />
                                                {formErrors.price && <div className="invalid-feedback">{formErrors.price}</div>}
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">
                                                Stock <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="stock"
                                                min="0"
                                                className={`form-control ${formErrors.stock ? 'is-invalid' : ''}`}
                                                value={formData.stock || ''}
                                                onChange={handleInputChange}
                                                placeholder="0"
                                                required
                                            />
                                            {formErrors.stock && <div className="invalid-feedback">{formErrors.stock}</div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseForm}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save me-2"></i>
                                        {editingProduct ? 'Actualizar' : 'Crear'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabla de Productos */}
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
                            <h5 className="card-title mb-0">Inventario de Productos</h5>
                            <small className="text-muted">
                                {products.length} de {pagination.totalRecords} productos
                            </small>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {products.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Producto</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th>Stock</th>
                                            <th>Estado</th>
                                            <th>Fecha</th>
                                            <th style={{ width: '120px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <ProductRow
                                                key={product.id}
                                                product={product}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                formatPrice={formatPrice}
                                                getStockBadge={getStockBadge}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-boxes fa-3x text-muted mb-3"></i>
                                <h5>No hay productos disponibles</h5>
                                <p className="text-muted mb-3">Comienza agregando tu primer producto al inventario</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowForm(true)}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Agregar Producto
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Paginación */}
            {products.length > 0 && (
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

export default ProductsPage;