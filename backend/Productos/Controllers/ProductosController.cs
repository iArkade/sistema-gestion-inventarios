using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Productos.Data;
using Productos.Models;

namespace Productos.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ProductosController> _logger;

    private static readonly MemoryCacheEntryOptions DefaultCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
        SlidingExpiration = TimeSpan.FromMinutes(2),
        Priority = CacheItemPriority.Normal
    };

    private static readonly MemoryCacheEntryOptions LongCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10),
        SlidingExpiration = TimeSpan.FromMinutes(5),
        Priority = CacheItemPriority.High
    };

    public ProductosController(AppDbContext context, IMemoryCache cache, ILogger<ProductosController> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<Producto>>>> GetProducts(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? sortBy = "name",
        [FromQuery] string? sortDirection = "asc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        try
        {
            pageSize = Math.Min(pageSize, 100);
            page = Math.Max(page, 1);

            var cacheKey = $"products_{search}_{category}_{sortBy}_{sortDirection}_{page}_{pageSize}";
            
            if (_cache.TryGetValue(cacheKey, out ApiResponse<PagedResult<Producto>>? cachedResult))
            {
                _logger.LogInformation("Returning cached products for key: {CacheKey}", cacheKey);
                return Ok(cachedResult);
            }

            var query = _context.Productos.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(p => 
                    EF.Functions.Like(p.Name.ToLower(), $"%{searchLower}%") ||
                    (p.Description != null && EF.Functions.Like(p.Description.ToLower(), $"%{searchLower}%")));
            }

            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(p => p.Category == category);

            var totalRecords = await query.CountAsync();

            query = sortBy?.ToLower() switch
            {
                "name" => sortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(p => p.Name)
                    : query.OrderBy(p => p.Name),
                "price" => sortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(p => p.Price)
                    : query.OrderBy(p => p.Price),
                "stock" => sortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(p => p.Stock)
                    : query.OrderBy(p => p.Stock),
                "category" => sortDirection?.ToLower() == "desc"
                    ? query.OrderByDescending(p => p.Category)
                    : query.OrderBy(p => p.Category),
                _ => query.OrderBy(p => p.Name)
            };

            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new PagedResult<Producto>
            {
                Data = products,
                TotalRecords = totalRecords,
                Page = page,
                PageSize = pageSize
            };

            var response = new ApiResponse<PagedResult<Producto>>
            {
                Success = true,
                Message = "Productos obtenidos exitosamente",
                Data = result
            };

            var cacheTime = (string.IsNullOrEmpty(search) && string.IsNullOrEmpty(category)) 
                ? LongCacheOptions 
                : DefaultCacheOptions;
            
            _cache.Set(cacheKey, response, cacheTime);
            
            _logger.LogInformation("Products retrieved and cached for key: {CacheKey}", cacheKey);
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving products");
            return StatusCode(500, new ApiResponse<PagedResult<Producto>>
            {
                Success = false,
                Message = "Error al obtener productos",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<Producto>>> GetProduct(int id)
    {
        try
        {
            var cacheKey = $"product_{id}";
            
            if (_cache.TryGetValue(cacheKey, out ApiResponse<Producto>? cachedResult))
            {
                _logger.LogInformation("Returning cached product for ID: {ProductId}", id);
                return Ok(cachedResult);
            }

            var product = await _context.Productos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            
            if (product == null)
            {
                return NotFound(new ApiResponse<Producto>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            var response = new ApiResponse<Producto>
            {
                Success = true,
                Message = "Producto obtenido exitosamente",
                Data = product
            };

            _cache.Set(cacheKey, response, LongCacheOptions);
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving product {ProductId}", id);
            return StatusCode(500, new ApiResponse<Producto>
            {
                Success = false,
                Message = "Error al obtener producto",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Producto>>> CreateProduct(CreateProductRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new ApiResponse<Producto>
                {
                    Success = false,
                    Message = "Datos de entrada inválidos",
                    Errors = errors
                });
            }

            var product = new Producto
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                Category = request.Category.Trim(),
                ImageUrl = request.ImageUrl?.Trim(),
                Price = request.Price,
                Stock = request.Stock
            };

            _context.Productos.Add(product);
            await _context.SaveChangesAsync();

            InvalidateProductCache();

            var response = new ApiResponse<Producto>
            {
                Success = true,
                Message = "Producto creado exitosamente",
                Data = product
            };

            _logger.LogInformation("Product created with ID: {ProductId}", product.Id);

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating product");
            return StatusCode(500, new ApiResponse<Producto>
            {
                Success = false,
                Message = "Error al crear producto",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<Producto>>> UpdateProduct(int id, CreateProductRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new ApiResponse<Producto>
                {
                    Success = false,
                    Message = "Datos de entrada inválidos",
                    Errors = errors
                });
            }

            var product = await _context.Productos.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponse<Producto>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            product.Name = request.Name.Trim();
            product.Description = request.Description?.Trim();
            product.Category = request.Category.Trim();
            product.ImageUrl = request.ImageUrl?.Trim();
            product.Price = request.Price;
            product.Stock = request.Stock;

            await _context.SaveChangesAsync();

            InvalidateProductCache();
            _cache.Remove($"product_{id}");

            var response = new ApiResponse<Producto>
            {
                Success = true,
                Message = "Producto actualizado exitosamente",
                Data = product
            };

            _logger.LogInformation("Product updated with ID: {ProductId}", id);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating product {ProductId}", id);
            return StatusCode(500, new ApiResponse<Producto>
            {
                Success = false,
                Message = "Error al actualizar producto",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProduct(int id)
    {
        try
        {
            var product = await _context.Productos.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            _context.Productos.Remove(product);
            await _context.SaveChangesAsync();

            InvalidateProductCache();
            _cache.Remove($"product_{id}");

            _logger.LogInformation("Product deleted with ID: {ProductId}", id);

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Producto eliminado exitosamente",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting product {ProductId}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error al eliminar producto",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpPut("{id:int}/stock")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateStock(int id, [FromBody] int newStock)
    {
        try
        {
            if (newStock < 0)
            {
                return BadRequest(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "El stock no puede ser negativo"
                });
            }

            var rowsAffected = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE Productos SET Stock = {0} WHERE Id = {1}", newStock, id);

            if (rowsAffected == 0)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            _cache.Remove($"product_{id}");
            InvalidateProductCache();

            _logger.LogInformation("Stock updated for product {ProductId} to {NewStock}", id, newStock);

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Stock actualizado exitosamente",
                Data = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating stock for product {ProductId}", id);
            return StatusCode(500, new ApiResponse<bool>
            {
                Success = false,
                Message = "Error al actualizar stock",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetCategories()
    {
        try
        {
            const string cacheKey = "categories";
            
            if (_cache.TryGetValue(cacheKey, out ApiResponse<List<string>>? cachedResult))
            {
                _logger.LogInformation("Returning cached categories");
                return Ok(cachedResult);
            }

            var categories = await _context.Productos
                .AsNoTracking()
                .Select(p => p.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var response = new ApiResponse<List<string>>
            {
                Success = true,
                Message = "Categorías obtenidas exitosamente",
                Data = categories
            };

            _cache.Set(cacheKey, response, TimeSpan.FromMinutes(15));

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving categories");
            return StatusCode(500, new ApiResponse<List<string>>
            {
                Success = false,
                Message = "Error al obtener categorías",
                Errors = new List<string> { ex.Message }
            });
        }
    }

    private void InvalidateProductCache()
    {
        var cacheKeys = new[] { "categories" };
        foreach (var key in cacheKeys)
        {
            _cache.Remove(key);
        }

        _logger.LogInformation("Product cache invalidated");
    }
}