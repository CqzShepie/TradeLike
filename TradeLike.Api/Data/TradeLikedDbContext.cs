using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Models;

namespace TradeLike.Api.Data;

public class TradeLikeDbContext : DbContext
{
    public TradeLikeDbContext(DbContextOptions<TradeLikeDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Job> Jobs => Set<Job>();

    public DbSet<Quote> Quotes => Set<Quote>();

    public DbSet<QuoteLineItem> QuoteLineItems => Set<QuoteLineItem>();

    public DbSet<Engineer> Engineers => Set<Engineer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Quote>()
            .Property(q => q.Amount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quote>()
            .Property(q => q.Subtotal)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quote>()
            .Property(q => q.VatTotal)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quote>()
            .Property(q => q.DiscountTotal)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quote>()
            .Property(q => q.Total)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quote>()
            .HasMany(q => q.LineItems)
            .WithOne(i => i.Quote)
            .HasForeignKey(i => i.QuoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<QuoteLineItem>()
            .Property(i => i.Quantity)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<QuoteLineItem>()
            .Property(i => i.UnitPrice)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<QuoteLineItem>()
            .Property(i => i.VatRate)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<QuoteLineItem>()
            .Property(i => i.LineTotal)
            .HasColumnType("decimal(18,2)");
    }
}