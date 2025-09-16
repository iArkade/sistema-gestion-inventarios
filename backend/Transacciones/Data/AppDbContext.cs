using Microsoft.EntityFrameworkCore;
using Transacciones.Models;

namespace Transacciones.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Transaccion> Transacciones => Set<Transaccion>();
}