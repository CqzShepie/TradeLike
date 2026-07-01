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

    public DbSet<CustomerStaffTeam> CustomerStaffTeams => Set<CustomerStaffTeam>();

    public DbSet<CustomerStaffMember> CustomerStaffMembers => Set<CustomerStaffMember>();

    public DbSet<CustomerStaffMemberTeam> CustomerStaffMemberTeams => Set<CustomerStaffMemberTeam>();

    public DbSet<CustomerStaffSecurityRequest> CustomerStaffSecurityRequests => Set<CustomerStaffSecurityRequest>();

    public DbSet<StaffLeaveRequest> StaffLeaveRequests => Set<StaffLeaveRequest>();

    public DbSet<JobAssignment> JobAssignments => Set<JobAssignment>();

    public DbSet<JobAssignmentStaff> JobAssignmentStaff => Set<JobAssignmentStaff>();

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
                .HasDefaultValue("Trial");

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
            entity.HasIndex(log => log.TenantId);

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
            entity.HasIndex(j => j.TenantId);

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

            entity.Property(j => j.CalendarColour)
                .HasMaxLength(40);

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
            entity.HasIndex(q => q.TenantId);

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

            entity.Property(q => q.CustomerName)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(q => q.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(q => q.DiscountType)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("Amount");

            entity.Property(q => q.DiscountValue)
                .HasPrecision(18, 2)
                .HasDefaultValue(0m);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasIndex(customer => customer.TenantId);
        });

        modelBuilder.Entity<Engineer>(entity =>
        {
            entity.HasIndex(engineer => engineer.TenantId);
        });

        modelBuilder.Entity<QuoteLineItem>(entity =>
        {
            entity.HasIndex(item => item.TenantId);

            entity.Property(item => item.Quantity)
                .HasPrecision(18, 2);

            entity.Property(item => item.UnitPrice)
                .HasPrecision(18, 2);

            entity.Property(item => item.VatRate)
                .HasPrecision(18, 2);

            entity.Property(item => item.LineTotal)
                .HasPrecision(18, 2);
        });

        modelBuilder.Entity<CustomerStaffTeam>(entity =>
        {
            entity.HasIndex(team => team.CompanyUserId);

            entity.Property(team => team.Name)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(team => team.Description)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(team => team.Colour)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(team => team.DefaultJobType)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(team => team.ServiceArea)
                .IsRequired()
                .HasMaxLength(250);

            entity.Property(team => team.WorkingHours)
                .IsRequired()
                .HasMaxLength(250);
        });

        modelBuilder.Entity<CustomerStaffMember>(entity =>
        {
            entity.HasIndex(member => member.CompanyUserId);

            entity.HasIndex(member => new { member.CompanyUserId, member.Email })
                .IsUnique();

            entity.HasIndex(member => member.InviteToken);

            entity.Property(member => member.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(member => member.LastName)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(member => member.Email)
                .IsRequired()
                .HasMaxLength(256);

            entity.Property(member => member.Phone)
                .IsRequired()
                .HasMaxLength(80);

            entity.Property(member => member.RoleName)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(member => member.Status)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(member => member.PermissionPresetName)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(member => member.Skills)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(member => member.ServiceArea)
                .IsRequired()
                .HasMaxLength(250);

            entity.Property(member => member.WorkingHours)
                .IsRequired()
                .HasMaxLength(250);

            entity.Property(member => member.CalendarColour)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(member => member.InviteToken)
                .HasMaxLength(120);

            entity.Property(member => member.InviteExpiresAt)
                .HasDefaultValueSql("DATEADD(day, 14, SYSUTCDATETIME())");

            entity.HasIndex(member => member.InviteExpiresAt);
        });

        modelBuilder.Entity<CustomerStaffMemberTeam>(entity =>
        {
            entity.HasKey(memberTeam => new
            {
                memberTeam.StaffMemberId,
                memberTeam.TeamId
            });

            entity.HasIndex(memberTeam => memberTeam.TeamId);
        });

        modelBuilder.Entity<CustomerStaffSecurityRequest>(entity =>
        {
            entity.HasIndex(request => request.CompanyUserId);

            entity.HasIndex(request => request.StaffMemberId);

            entity.Property(request => request.RequestType)
                .IsRequired()
                .HasMaxLength(80);

            entity.Property(request => request.Status)
                .IsRequired()
                .HasMaxLength(80);
        });

        modelBuilder.Entity<StaffLeaveRequest>(entity =>
        {
            entity.HasIndex(request => new
                {
                    request.TenantId,
                    request.StaffMemberId
                });

            entity.HasIndex(request => new
            {
                request.TenantId,
                request.StartDate,
                request.EndDate
            });

            entity.Property(request => request.Reason)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(request => request.Status)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            entity.HasOne(request => request.StaffMember)
                .WithMany()
                .HasForeignKey(request => request.StaffMemberId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<JobAssignment>(entity =>
        {
            entity.HasIndex(assignment => new
                {
                    assignment.TenantId,
                    assignment.JobId
                })
                .IsUnique();

            entity.HasOne(assignment => assignment.Job)
                .WithMany()
                .HasForeignKey(assignment => assignment.JobId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(assignment => assignment.LeadStaffMember)
                .WithMany()
                .HasForeignKey(assignment => assignment.LeadStaffMemberId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<JobAssignmentStaff>(entity =>
        {
            entity.HasKey(staff => new
            {
                staff.JobAssignmentId,
                staff.StaffMemberId
            });

            entity.HasOne(staff => staff.JobAssignment)
                .WithMany(assignment => assignment.StaffMembers)
                .HasForeignKey(staff => staff.JobAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(staff => staff.StaffMember)
                .WithMany()
                .HasForeignKey(staff => staff.StaffMemberId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
