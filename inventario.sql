CREATE DATABASE IF NOT EXISTS gestion_inventario;
USE gestion_inventario;

-- Tabla Productos
CREATE TABLE Productos (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(200) NOT NULL,
    Description VARCHAR(500),
    Category VARCHAR(100) NOT NULL,
    ImageUrl VARCHAR(500),
    Price DECIMAL(18,2) NOT NULL,
    Stock INT NOT NULL DEFAULT 0 CHECK (Stock >= 0),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Transacciones
CREATE TABLE Transacciones (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    TransactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TransactionType VARCHAR(10) NOT NULL CHECK (TransactionType IN ('Purchase', 'Sale')),
    ProductId INT NOT NULL,
    ProductName VARCHAR(200) NOT NULL, -- <--- Comma added here
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitPrice DECIMAL(18,2) NOT NULL,
    TotalPrice DECIMAL(18,2) NOT NULL,
    Details VARCHAR(500),
    FOREIGN KEY (ProductId) REFERENCES Productos(Id) ON DELETE CASCADE
);

-- Índices para mejor rendimiento
CREATE INDEX IX_Products_Category ON Productos(Category);
CREATE INDEX IX_Products_Name ON Productos(Name);
CREATE INDEX IX_Transactions_ProductId ON Transacciones(ProductId);
CREATE INDEX IX_Transactions_Date ON Transacciones(TransactionDate);
CREATE INDEX IX_Transactions_Type ON Transacciones(TransactionType);
CREATE INDEX IX_Transactions_ProductName ON Transacciones(ProductName);

-- Datos de ejemplo
INSERT INTO Productos (Name, Description, Category, Price, Stock) VALUES
('Laptop HP Pavilion', 'Laptop para oficina y gaming', 'Electronicos', 899.99, 15),
('Mouse Inalambrico Logitech', 'Mouse ergonómico inalámbrico', 'Electronicos', 25.99, 50),
('Teclado Mecánico', 'Teclado mecánico retroiluminado', 'Electronicos', 75.00, 20),
('Monitor Samsung 24"', 'Monitor Full HD para oficina', 'Electronicos', 199.99, 8),
('Auriculares Sony', 'Auriculares over-ear con cancelacion', 'Electronicos', 149.99, 25),
('Camiseta Nike', 'Camiseta deportiva de algodon', 'Ropa', 29.99, 100),
('Jeans Levi''s', 'Jeans clasicos azules', 'Ropa', 79.99, 40),
('Libro "Codigo Limpio"', 'Libro de programación', 'Libros', 45.00, 30),
('Libro "Patrones de Diseño"', 'Patrones de diseño en software', 'Libros', 55.00, 20),
('Smartphone Samsung', 'Teléfono inteligente ultimo modelo', 'Electronicos', 699.99, 12);

-- Transacciones de ejemplo
INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Purchase', p.Id, p.Name, 10, 800.00, 8000.00, 'Compra inicial de inventario'
FROM Productos p WHERE p.Name LIKE '%Laptop%' LIMIT 1;

INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Sale', p.Id, p.Name, 5, 25.99, 129.95, 'Venta a cliente corporativo'
FROM Productos p WHERE p.Name LIKE '%Mouse%' LIMIT 1;

INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Purchase', p.Id, p.Name, 20, 20.00, 400.00, 'Reposición de stock'
FROM Productos p WHERE p.Name LIKE '%Mouse%' LIMIT 1;

INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Sale', p.Id, p.Name, 3, 75.00, 225.00, 'Venta individual'
FROM Productos p WHERE p.Name LIKE '%Teclado%' LIMIT 1;

INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Purchase', p.Id, p.Name, 15, 65.00, 975.00, 'Compra al por mayor'
FROM Productos p WHERE p.Name LIKE '%Teclado%' LIMIT 1;

INSERT INTO Transacciones (TransactionType, ProductId, ProductName, Quantity, UnitPrice, TotalPrice, Details)
SELECT 'Sale', p.Id, p.Name, 2, 899.99, 1799.98, 'Venta a empresa'
FROM Productos p WHERE p.Name LIKE '%Laptop%' LIMIT 1;