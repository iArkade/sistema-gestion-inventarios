// ProductsPage.tsx - Versión con diseño moderno y elegante
import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { productApi, NotificationService } from '../services/api';
import type { Product, CreateProductRequest, FormErrors, FilterParameters } from '../types';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Filtros
    const [search, setSearch] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Paginación
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [hasNextPage, setHasNextPage] = useState<boolean>(false);
    const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);

    const [formData, setFormData] = useState<CreateProductRequest>({
        name: '',
        description: '',
        category: '',
        imageUrl: '',
        price: 0,
        stock: 0
    });

    const [formErrors, setFormErrors] = useState<FormErrors>({});

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, [search, category, sortBy, sortDirection, currentPage, pageSize]);

    const loadProducts = async (): Promise<void> => {
        setLoading(true);
        try {
            const filters: FilterParameters = {
                search,
                category,
                sortBy,
                sortDirection,
                page: currentPage,
                pageSize
            };

            const result = await productApi.getAll(filters);
            setProducts(result.data);
            setTotalPages(result.totalPages);
            setTotalRecords(result.totalRecords);
            setHasNextPage(result.hasNextPage);
            setHasPreviousPage(result.hasPreviousPage);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            NotificationService.show('Error al cargar los productos', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async (): Promise<void> => {
        try {
            const result = await productApi.getCategories();
            setCategories(result);
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    };

    const validateForm = (): boolean => {
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
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!validateForm()) {
            NotificationService.show('Por favor corrige los errores en el formulario', 'warning');
            return;
        }

        try {
            if (editingProduct) {
                await productApi.update(editingProduct.id, formData);
                NotificationService.show('Producto actualizado exitosamente', 'success');
            } else {
                await productApi.create(formData);
                NotificationService.show('Producto creado exitosamente', 'success');
            }

            handleCloseForm();
            await loadProducts();
            await loadCategories();
        } catch (error) {
            console.error('Error al guardar producto:', error);
            NotificationService.show('Error al guardar el producto', 'danger');
        }
    };

    const handleEdit = async (product: Product): Promise<void> => {
        setEditingProduct(product);

        // Asegurar que tenemos las categorías cargadas
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
    };

    const handleDelete = async (product: Product): Promise<void> => {
        const confirmed = window.confirm(
            `¿Estás seguro de que deseas eliminar este producto?\n\n` +
            `📦 Producto: ${product.name}\n` +
            `📂 Categoría: ${product.category}\n` +
            `📊 Stock actual: ${product.stock} unidades\n` +
            `💰 Precio: $${product.price.toFixed(2)}\n\n` +
            `⚠️ Esta acción no se puede deshacer.`
        );

        if (confirmed) {
            try {
                await productApi.delete(product.id);
                NotificationService.show('Producto eliminado exitosamente', 'success');
                await loadProducts();
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                NotificationService.show('Error al eliminar el producto', 'danger');
            }
        }
    };

    const handleCloseForm = (): void => {
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', description: '', category: '', imageUrl: '', price: 0, stock: 0 });
        setFormErrors({});
    };

    const handlePageChange = (page: number): void => {
        setCurrentPage(page);
    };

    const handleFilterChange = (): void => {
        setCurrentPage(1);
    };

    const clearFilters = (): void => {
        setSearch('');
        setCategory('');
        setSortBy('name');
        setSortDirection('asc');
        setCurrentPage(1);
        NotificationService.show('Filtros limpiados', 'info');
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
        }));

        // Limpiar error específico al escribir
        if (formErrors[name]) {
            setFormErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const getStockBadge = (stock: number) => {
        if (stock === 0) return { class: 'bg-danger', text: 'Sin Stock', icon: 'fa-times-circle' };
        if (stock < 10) return { class: 'bg-warning', text: 'Stock Bajo', icon: 'fa-exclamation-triangle' };
        return { class: 'bg-success', text: 'Disponible', icon: 'fa-check-circle' };
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
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
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    borderRadius: '16px',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                <i className="fas fa-boxes fa-lg text-white"></i>
                            </div>
                        </div>
                        <div>
                            <h1 className="mb-1 fw-bold text-gradient">Gestión de Productos</h1>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 text-end">
                    <button
                        className="btn btn-primary btn-lg hover-lift"
                        onClick={() => {
                            setShowForm(true);
                            setEditingProduct(null);
                            setFormData({ name: '', description: '', category: '', imageUrl: '', price: 0, stock: 0 });
                            setFormErrors({});
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="row mb-4">
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-boxes fa-2x text-primary"></i>
                            </div>
                            <h4 className="fw-bold text-primary">{totalRecords}</h4>
                            <small className="text-muted">Total Productos</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-tags fa-2x text-info"></i>
                            </div>
                            <h4 className="fw-bold text-info">{categories.length}</h4>
                            <small className="text-muted">Categorías</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-check-circle fa-2x text-success"></i>
                            </div>
                            <h4 className="fw-bold text-success">
                                {products.filter(p => p.stock > 0).length}
                            </h4>
                            <small className="text-muted">En Stock</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 mb-3">
                    <div className="card h-100">
                        <div className="card-body text-center">
                            <div className="mb-2">
                                <i className="fas fa-exclamation-triangle fa-2x text-warning"></i>
                            </div>
                            <h4 className="fw-bold text-warning">
                                {products.filter(p => p.stock < 10 && p.stock > 0).length}
                            </h4>
                            <small className="text-muted">Stock Bajo</small>
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
                            Mostrando {products.length} de {totalRecords} productos
                        </small>
                    </div>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label">
                                <i className="fas fa-search me-1"></i>
                                Buscar Producto
                            </label>
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Nombre o descripción..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        handleFilterChange();
                                    }}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">
                                <i className="fas fa-tag me-1"></i>
                                Categoría
                            </label>
                            <select
                                className="form-select"
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    handleFilterChange();
                                }}
                            >
                                <option value="">Todas las categorías</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Ordenar por</label>
                            <select
                                className="form-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
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
                                value={sortDirection}
                                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                            >
                                <option value="asc">⬆ Ascendente</option>
                                <option value="desc">⬇ Descendente</option>
                            </select>
                        </div>
                        <div className="col-md-1">
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
                                                <i className="fas fa-box me-1"></i>
                                                Nombre del Producto
                                                <span className="text-danger">*</span>
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
                                                <i className="fas fa-tags me-1"></i>
                                                Categoría
                                                <span className="text-danger">*</span>
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
                                            <small className="text-muted">Puedes escribir una nueva categoría</small>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="form-label">
                                            <i className="fas fa-align-left me-1"></i>
                                            Descripción
                                        </label>
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
                                        <label className="form-label">
                                            <i className="fas fa-image me-1"></i>
                                            URL de Imagen
                                        </label>
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
                                                <i className="fas fa-dollar-sign me-1"></i>
                                                Precio
                                                <span className="text-danger">*</span>
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
                                                <i className="fas fa-cubes me-1"></i>
                                                Stock
                                                <span className="text-danger">*</span>
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
                                    <button type="button" className="btn btn-outline-secondary" onClick={handleCloseForm}>
                                        <i className="fas fa-times me-2"></i>
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
                <div className="card hover-lift">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table mb-0">
                                <thead>
                                    <tr>
                                        <th>
                                            <i className="fas fa-box me-2"></i>
                                            Producto
                                        </th>
                                        <th>
                                            <i className="fas fa-tag me-2"></i>
                                            Categoría
                                        </th>
                                        <th>
                                            <i className="fas fa-dollar-sign me-2"></i>
                                            Precio
                                        </th>
                                        <th>
                                            <i className="fas fa-cubes me-2"></i>
                                            Stock
                                        </th>
                                        <th>
                                            <i className="fas fa-info-circle me-2"></i>
                                            Estado
                                        </th>
                                        <th>
                                            <i className="fas fa-calendar me-2"></i>
                                            Fecha
                                        </th>
                                        <th style={{ width: '130px' }}>
                                            <i className="fas fa-cogs me-2"></i>
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length > 0 ? (
                                        products.map(product => {
                                            const stockInfo = getStockBadge(product.stock);
                                            return (
                                                <tr key={product.id}>
                                                    <td>
                                                        <div>
                                                            <div className="fw-bold text-dark">{product.name}</div>
                                                            {product.description && (
                                                                <small className="text-muted">
                                                                    {product.description.length > 60
                                                                        ? `${product.description.substring(0, 60)}...`
                                                                        : product.description}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-info">
                                                            <i className="fas fa-tag me-1"></i>
                                                            {product.category}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold text-success fs-6">
                                                            {formatPrice(product.price)}
                                                        </span>
                                                    </td>
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
                                                            <i className="fas fa-calendar-alt me-1"></i>
                                                            {new Date(product.createdAt).toLocaleDateString('es-ES')}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm" role="group">
                                                            <button
                                                                className="btn btn-outline-primary"
                                                                onClick={() => handleEdit(product)}
                                                                title={`Editar ${product.name}`}
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-outline-danger"
                                                                onClick={() => handleDelete(product)}
                                                                title={`Eliminar ${product.name}`}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="text-center py-5">
                                                <div className="empty-state">
                                                    <i className="fas fa-inbox"></i>
                                                    <h5>No hay productos disponibles</h5>
                                                    <p>Comienza agregando tu primer producto al inventario</p>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setShowForm(true)}
                                                    >
                                                        <i className="fas fa-plus me-2"></i>
                                                        Agregar Producto
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
            {products.length > 0 && (
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

export default ProductsPage;