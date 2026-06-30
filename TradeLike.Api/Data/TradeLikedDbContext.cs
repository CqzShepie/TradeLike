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

        modelBuilder.Entity<Job>(entity =>
        {
            entity.Property(j => j.Customer)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(j => j.Phone)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(j => j.JobTitle)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(j => j.Address)
                .IsRequired()
                .HasMaxLength(250);

            entity.Property(j => j.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(j => j.Priority)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(j => j.Notes)
                .HasMaxLength(4000);

            entity.HasOne(j => j.Quote)
                .WithMany()
                .HasForeignKey(j => j.QuoteId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(j => j.Engineer)
                .WithMany()
                .HasForeignKey(j => j.EngineerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Quote>(entity =>
        {
            entity.Property(q => q.CustomerName)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(q => q.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(q => q.Description)
                .HasMaxLength(4000);

            entity.Property(q => q.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(q => q.Notes)
                .HasMaxLength(4000);

            entity.Property(q => q.Amount)
                .HasPrecision(18, 2);

            entity.Property(q => q.Subtotal)
                .HasPrecision(18, 2);

            entity.Property(q => q.VatTotal)
                .HasPrecision(18, 2);

            entity.Property(q => q.DiscountTotal)
                .HasPrecision(18, 2);

            entity.Property(q => q.Total)
                .HasPrecision(18, 2);

            entity.HasMany(q => q.LineItems)
                .WithOne(i => i.Quote)
                .HasForeignKey(i => i.QuoteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuoteLineItem>(entity =>
        {
            entity.ToTable("QuoteLineItems");

            entity.Property(i => i.Type)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(i => i.Description)
                .IsRequired()
                .HasMaxLength(250);

            entity.Property(i => i.Quantity)
                .HasPrecision(18, 2);

            entity.Property(i => i.UnitPrice)
                .HasPrecision(18, 2);

            entity.Property(i => i.VatRate)
                .HasPrecision(18, 2);

            entity.Property(i => i.LineTotal)
                .HasPrecision(18, 2);
        });
    }
}