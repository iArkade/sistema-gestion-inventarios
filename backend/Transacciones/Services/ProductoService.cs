using Transacciones.Models;
using System.Text.Json;

namespace Transacciones.Services
{
    public class ProductoService
    {
        private readonly HttpClient _httpClient;

        public ProductoService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<Product?> GetProductAsync(int productId)
        {
            try
            {
                // Cambio: /api/products → /api/productos
                var response = await _httpClient.GetAsync($"https://localhost:7001/api/productos/{productId}");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var apiResponse = JsonSerializer.Deserialize<ApiResponse<Product>>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    return apiResponse?.Data;
                }
                return null;
            }
            catch
            {
                return null;
            }
        }

        public async Task<bool> UpdateStockAsync(int productId, int newStock)
        {
            try
            {
                // Cambio: /api/products → /api/productos
                var response = await _httpClient.PutAsJsonAsync($"https://localhost:7001/api/productos/{productId}/stock", newStock);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<List<Product>> GetAllProductsAsync()
        {
            try
            {
                // Cambio: /api/products → /api/productos
                var response = await _httpClient.GetAsync("https://localhost:7001/api/productos?pageSize=1000");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var apiResponse = JsonSerializer.Deserialize<ApiResponse<PagedResult<Product>>>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    return apiResponse?.Data?.Data ?? new List<Product>();
                }
                return new List<Product>();
            }
            catch
            {
                return new List<Product>();
            }
        }
    }
}