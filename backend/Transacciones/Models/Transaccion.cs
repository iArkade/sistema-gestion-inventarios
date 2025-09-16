using System.ComponentModel.DataAnnotations;
namespace Transacciones.Models;

public class Transaccion
{
    public int Id { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    [Required] public string TransactionType { get; set; } = "";
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Details { get; set; }
}

public class CreateTransactionRequest
{
    [Required(ErrorMessage = "El tipo de transacción es obligatorio")]
    public string TransactionType { get; set; } = "";

    [Required(ErrorMessage = "El ID del producto es obligatorio")]
    public int ProductId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0")]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "El precio unitario debe ser mayor a 0")]
    public decimal UnitPrice { get; set; }

    [StringLength(500, ErrorMessage = "Los detalles no pueden exceder 500 caracteres")]
    public string? Details { get; set; }
}

public class UpdateTransactionRequest
{
    [Required(ErrorMessage = "El tipo de transacción es obligatorio")]
    public string TransactionType { get; set; } = "";

    [Required(ErrorMessage = "El ID del producto es obligatorio")]
    public int ProductId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0")]
    public int Quantity { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "El precio unitario debe ser mayor a 0")]
    public decimal UnitPrice { get; set; }

    [StringLength(500, ErrorMessage = "Los detalles no pueden exceder 500 caracteres")]
    public string? Details { get; set; }
}

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Stock { get; set; }
    public decimal Price { get; set; }
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