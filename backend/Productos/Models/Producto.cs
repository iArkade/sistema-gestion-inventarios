using System.ComponentModel.DataAnnotations;
namespace Productos.Models;

public class Producto
{
    public int Id { get; set; }
    [Required] public string Name { get; set; } = "";
    public string? Description { get; set; }
    [Required] public string Category { get; set; } = "";
    public string? ImageUrl { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateProductRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede exceder 200 caracteres")]
    public string Name { get; set; } = "";

    [StringLength(500, ErrorMessage = "La descripción no puede exceder 500 caracteres")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "La categoría es obligatoria")]
    [StringLength(100, ErrorMessage = "La categoría no puede exceder 100 caracteres")]
    public string Category { get; set; } = "";

    [StringLength(500, ErrorMessage = "La URL de imagen no puede exceder 500 caracteres")]
    public string? ImageUrl { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "El precio debe ser mayor a 0")]
    public decimal Price { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "El stock no puede ser negativo")]
    public int Stock { get; set; }
}

public class PagedResult<T>
{
    public List<T> Data { get; set; } = new();
    public int TotalRecords { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalRecords / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();
}