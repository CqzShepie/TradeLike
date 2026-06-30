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

    public DbSet<BusinessSettings> BusinessSettings => Set<BusinessSettings>();

    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Job> Jobs => Set<Job>();

    public DbSet<Quote> Quotes => Set<Quote>();

    public DbSet<QuoteLineItem> QuoteLineItems => Set<QuoteLineItem>();

    public DbSet<Engineer> Engineers => Set<Engineer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(user => user.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(user => user.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(user => user.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.HasIndex(user => user.Email)
                .IsUnique();

            entity.Property(user => user.PasswordHash)
                .IsRequired();

            entity.Property(user => user.Role)
                .IsRequired()
                .HasMaxLength(40)
                .HasDefaultValue("Customer");

            entity.Property(user => user.PersonalAssistantTo)
                .HasMaxLength(220);

            entity.Property(user => user.AccountStatus)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue("Trial");

            entity.Property(user => user.DiscountType)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("None");

            entity.Property(user => user.DiscountValue)
                .HasPrecision(18, 2)
                .HasDefaultValue(0m);

            entity.Property(user => user.FreeMonths)
                .HasDefaultValue(0);

            entity.Property(user => user.BusinessName)
                .HasMaxLength(180);

            entity.Property(user => user.OwnerName)
                .HasMaxLength(180);

            entity.Property(user => user.OwnerPhone)
                .HasMaxLength(40);

            entity.Property(user => user.SubscriptionPlan)
                .IsRequired()
                .HasMaxLength(40)
                .HasDefaultValue("Solo");

            entity.Property(user => user.BillingStatus)
                .IsRequired()
                .HasMaxLength(40)
                .HasDefaultValue("Trial");

            entity.Property(user => user.AdminTags)
                .HasMaxLength(500);

            entity.Property(user => user.SupportNotes)
                .HasMaxLength(4000);

            entity.Property(user => user.HealthStatus)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue("Green");

            entity.Property(user => user.AccountSource)
                .HasMaxLength(120);

            entity.Property(user => user.CancelReason)
                .HasMaxLength(500);

            entity.Property(user => user.AdminNotes)
                .HasMaxLength(4000);

            entity.HasIndex(user => user.Role);

            entity.HasIndex(user => user.AccountStatus);

            entity.HasIndex(user => user.BillingStatus);
        });

        modelBuilder.Entity<BusinessSettings>(entity =>
        {
            entity.Property(settings => settings.BusinessName)
                .IsRequired()
                .HasMaxLength(180);

            entity.Property(settings => settings.DefaultVatRate)
                .HasPrecision(5, 2)
                .HasDefaultValue(20m);

            entity.Property(settings => settings.QuotePrefix)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("Q");

            entity.Property(settings => settings.InvoicePrefix)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("INV");
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.Property(log => log.ActorEmail)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(log => log.ActorName)
                .IsRequired()
                .HasMaxLength(220);

            entity.Property(log => log.ActorRole)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(log => log.Action)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(log => log.TargetType)
                .IsRequired()
                .HasMaxLength(80);

            entity.Property(log => log.TargetEmail)
                .HasMaxLength(255);

            entity.Property(log => log.Summary)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(log => log.Details)
                .HasMaxLength(4000);

            entity.Property(log => log.IpAddress)
                .HasMaxLength(80);

            entity.Property(log => log.UserAgent)
                .HasMaxLength(500);

            entity.HasIndex(log => log.CreatedAt);

            entity.HasIndex(log => log.ActorUserId);

            entity.HasIndex(log => log.ActorEmail);

            entity.HasIndex(log => log.TargetId);

            entity.HasIndex(log => log.TargetEmail);
        });

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
        });
    }
}
