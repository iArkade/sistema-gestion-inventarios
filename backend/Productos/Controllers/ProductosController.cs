using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Productos.Data;
using Productos.Models;

namespace Productos.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductosController(AppDbContext context)
    {
        _context = context;
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
            var query = _context.Productos.AsQueryable();

            // Filtro por texto
            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(search) ||
                    (p.Description != null && p.Description.ToLower().Contains(search)));
            }

            // Filtro por categoría
            if (!string.IsNullOrEmpty(category))
                query = query.Where(p => p.Category == category);

            // Ordenamiento dinámico
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

            var totalRecords = await query.CountAsync();

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

            return Ok(new ApiResponse<PagedResult<Producto>>
            {
                Success = true,
                Message = "Productos obtenidos exitosamente",
                Data = result
            });
        }
        catch (Exception ex)
        {
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
            var product = await _context.Productos.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponse<Producto>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            return Ok(new ApiResponse<Producto>
            {
                Success = true,
                Message = "Producto obtenido exitosamente",
                Data = product
            });
        }
        catch (Exception ex)
        {
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
                Name = request.Name,
                Description = request.Description,
                Category = request.Category,
                ImageUrl = request.ImageUrl,
                Price = request.Price,
                Stock = request.Stock
            };

            _context.Productos.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProduct), new { id = product.Id },
                new ApiResponse<Producto>
                {
                    Success = true,
                    Message = "Producto creado exitosamente",
                    Data = product
                });
        }
        catch (Exception ex)
        {
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

            product.Name = request.Name;
            product.Description = request.Description;
            product.Category = request.Category;
            product.ImageUrl = request.ImageUrl;
            product.Price = request.Price;
            product.Stock = request.Stock;

            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Producto>
            {
                Success = true,
                Message = "Producto actualizado exitosamente",
                Data = product
            });
        }
        catch (Exception ex)
        {
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

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Producto eliminado exitosamente",
                Data = true
            });
        }
        catch (Exception ex)
        {
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

            var product = await _context.Productos.FindAsync(id);
            if (product == null)
            {
                return NotFound(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Producto no encontrado"
                });
            }

            product.Stock = newStock;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool>
            {
                Success = true,
                Message = "Stock actualizado exitosamente",
                Data = true
            });
        }
        catch (Exception ex)
        {
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
            var categories = await _context.Productos
                .Select(p => p.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            return Ok(new ApiResponse<List<string>>
            {
                Success = true,
                Message = "Categorías obtenidas exitosamente",
                Data = categories
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiResponse<List<string>>
            {
                Success = false,
                Message = "Error al obtener categorías",
                Errors = new List<string> { ex.Message }
            });
        }
    }
}
