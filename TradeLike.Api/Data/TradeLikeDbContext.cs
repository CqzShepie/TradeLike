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

    public DbSet<Plan> Plans => Set<Plan>();

    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    public DbSet<BusinessSettings> BusinessSettings => Set<BusinessSettings>();

    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    public DbSet<ApiUsageStat> ApiUsageStats => Set<ApiUsageStat>();

    public DbSet<Customer> Customers => Set<Customer>();

    public DbSet<Job> Jobs => Set<Job>();

    public DbSet<Quote> Quotes => Set<Quote>();

    public DbSet<QuoteLineItem> QuoteLineItems => Set<QuoteLineItem>();

    public DbSet<Invoice> Invoices => Set<Invoice>();

    public DbSet<DocumentTemplate> DocumentTemplates => Set<DocumentTemplate>();

    public DbSet<GeneratedDocument> GeneratedDocuments => Set<GeneratedDocument>();

    public DbSet<AccountingToken> AccountingTokens => Set<AccountingToken>();

    public DbSet<AccountingSyncLog> AccountingSyncLogs => Set<AccountingSyncLog>();

    public DbSet<FullDataExportLog> FullDataExportLogs => Set<FullDataExportLog>();

    public DbSet<Van> Vans => Set<Van>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<VanStock> VanStock => Set<VanStock>();

    public DbSet<Engineer> Engineers => Set<Engineer>();

    public DbSet<CustomerStaffTeam> CustomerStaffTeams => Set<CustomerStaffTeam>();

    public DbSet<CustomerStaffMember> CustomerStaffMembers => Set<CustomerStaffMember>();

    public DbSet<CustomerStaffMemberTeam> CustomerStaffMemberTeams => Set<CustomerStaffMemberTeam>();

    public DbSet<CustomerStaffSecurityRequest> CustomerStaffSecurityRequests => Set<CustomerStaffSecurityRequest>();

    public DbSet<StaffLeaveRequest> StaffLeaveRequests => Set<StaffLeaveRequest>();

    public DbSet<Expense> Expenses => Set<Expense>();

    public DbSet<MileageRate> MileageRates => Set<MileageRate>();

    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    public DbSet<JobAssignment> JobAssignments => Set<JobAssignment>();

    public DbSet<JobAssignmentStaff> JobAssignmentStaff => Set<JobAssignmentStaff>();

    public DbSet<Workflow> Workflows => Set<Workflow>();

    public DbSet<Dashboard> Dashboards => Set<Dashboard>();

    public DbSet<DashboardWidget> DashboardWidgets => Set<DashboardWidget>();

    public DbSet<Company> Companies => Set<Company>();

    public DbSet<CompanyUser> CompanyUsers => Set<CompanyUser>();

    public DbSet<CompanySetting> CompanySettings => Set<CompanySetting>();

    public DbSet<WebhookWorkflow> WebhookWorkflows => Set<WebhookWorkflow>();

    public DbSet<WebhookWorkflowDelivery> WebhookWorkflowDeliveries => Set<WebhookWorkflowDelivery>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.TenantId);

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
                .HasDefaultValue("CustomerDirector");

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

        modelBuilder.Entity<Plan>(entity =>
        {
            entity.Property(plan => plan.Name)
                .IsRequired()
                .HasMaxLength(40);

            entity.HasIndex(plan => plan.Name)
                .IsUnique();

            entity.HasData(
                new Plan { Id = 1, Name = "Solo", MonthlyPricePence = 3500, MaxIncludedUsers = 1, AdditionalUserCostPence = null, CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) },
                new Plan { Id = 2, Name = "Team", MonthlyPricePence = 7500, MaxIncludedUsers = 10, AdditionalUserCostPence = null, CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) },
                new Plan { Id = 3, Name = "Business", MonthlyPricePence = 15000, MaxIncludedUsers = 25, AdditionalUserCostPence = 500, CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) },
                new Plan { Id = 4, Name = "Enterprise", MonthlyPricePence = null, MaxIncludedUsers = null, AdditionalUserCostPence = null, CreatedAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc) });
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasIndex(subscription => subscription.TenantId)
                .IsUnique();

            entity.Property(subscription => subscription.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.HasOne(subscription => subscription.Tenant)
                .WithOne()
                .HasForeignKey<Subscription>(subscription => subscription.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(subscription => subscription.Plan)
                .WithMany()
                .HasForeignKey(subscription => subscription.PlanId)
                .OnDelete(DeleteBehavior.Restrict);
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

            entity.Property(settings => settings.LogRetentionDays)
                .HasDefaultValue(365);
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.HasIndex(log => log.TenantId);

            entity.HasIndex(log => new
            {
                log.TenantId,
                log.CreatedAtUtc
            });

            entity.Property(log => log.EntityType)
                .HasMaxLength(80);

            entity.Property(log => log.EntityId)
                .HasMaxLength(120);

            entity.Property(log => log.DiffJson)
                .HasColumnType("nvarchar(max)");

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

            entity.HasIndex(log => log.UserId);

            entity.HasIndex(log => log.ActorEmail);

            entity.HasIndex(log => log.TargetId);

            entity.HasIndex(log => log.TargetEmail);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(permission => new
            {
                permission.RoleName,
                permission.Entity,
                permission.Field
            });

            entity.Property(permission => permission.RoleName)
                .HasMaxLength(80);

            entity.Property(permission => permission.Entity)
                .HasMaxLength(80);

            entity.Property(permission => permission.Field)
                .HasMaxLength(120);

            entity.Property(permission => permission.Permission)
                .HasConversion<string>()
                .HasMaxLength(20);

            var seededAt = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);

            entity.HasData(
                new RolePermission { RoleName = "CustomerEmployee", Entity = "Jobs", Field = "InternalNotes", Permission = FieldPermission.Hidden, UpdatedAtUtc = seededAt },
                new RolePermission { RoleName = "CustomerManager", Entity = "Quote", Field = "MarginPence", Permission = FieldPermission.Read, UpdatedAtUtc = seededAt },
                new RolePermission { RoleName = "CustomerDirector", Entity = "*", Field = "*", Permission = FieldPermission.Write, UpdatedAtUtc = seededAt },
                new RolePermission { RoleName = "Director", Entity = "*", Field = "*", Permission = FieldPermission.Write, UpdatedAtUtc = seededAt },
                new RolePermission { RoleName = "Staff", Entity = "*", Field = "*", Permission = FieldPermission.Write, UpdatedAtUtc = seededAt });
        });

        modelBuilder.Entity<ApiUsageStat>(entity =>
        {
            entity.HasIndex(stat => new
                {
                    stat.TenantId,
                    stat.PeriodStartUtc
                })
                .IsUnique();

            entity.Property(stat => stat.PeriodStartUtc)
                .IsRequired();
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.HasIndex(j => j.TenantId);

            entity.HasIndex(j => new
            {
                j.TenantId,
                j.ScheduledDate
            });

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

            entity.HasIndex(q => new
            {
                q.TenantId,
                q.CreatedAt
            });

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

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasIndex(invoice => invoice.TenantId);
            entity.HasIndex(invoice => new { invoice.TenantId, invoice.CreatedAt });
            entity.HasIndex(invoice => new { invoice.TenantId, invoice.Status });

            entity.Property(invoice => invoice.InvoiceNumber)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(invoice => invoice.CustomerName)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(invoice => invoice.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(invoice => invoice.Status)
                .IsRequired()
                .HasMaxLength(30);
        });

        modelBuilder.Entity<DocumentTemplate>(entity =>
        {
            entity.HasIndex(template => new { template.TenantId, template.Type });

            entity.Property(template => template.Type)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(template => template.Name)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(template => template.HtmlTemplate)
                .IsRequired();
        });

        modelBuilder.Entity<GeneratedDocument>(entity =>
        {
            entity.HasIndex(document => new { document.TenantId, document.EntityType, document.EntityId });

            entity.Property(document => document.EntityType)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(document => document.PdfUrl)
                .IsRequired()
                .HasMaxLength(1000);
        });

        modelBuilder.Entity<AccountingToken>(entity =>
        {
            entity.HasIndex(token => new { token.TenantId, token.Provider })
                .IsUnique();

            entity.Property(token => token.Provider)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(token => token.AccessToken)
                .IsRequired();

            entity.Property(token => token.RefreshToken)
                .IsRequired();
        });

        modelBuilder.Entity<AccountingSyncLog>(entity =>
        {
            entity.HasIndex(log => new { log.TenantId, log.Provider, log.CreatedAtUtc });

            entity.Property(log => log.Provider)
                .HasConversion<string>()
                .HasMaxLength(30);

            entity.Property(log => log.Direction)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(log => log.Status)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(log => log.DetailsJson)
                .IsRequired();
        });

        modelBuilder.Entity<FullDataExportLog>(entity =>
        {
            entity.HasIndex(log => new { log.TenantId, log.CreatedAtUtc });

            entity.Property(log => log.PlanName)
                .IsRequired()
                .HasMaxLength(20);
        });

        modelBuilder.Entity<Van>(entity =>
        {
            entity.HasIndex(van => van.TenantId);

            entity.Property(van => van.Name)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(van => van.Registration)
                .HasMaxLength(40);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasIndex(product => product.TenantId);

            entity.Property(product => product.Name)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(product => product.Sku)
                .HasMaxLength(60);
        });

        modelBuilder.Entity<VanStock>(entity =>
        {
            entity.HasIndex(stock => new { stock.TenantId, stock.VanId, stock.ProductId })
                .IsUnique();

            entity.HasOne(stock => stock.Van)
                .WithMany(van => van.Stock)
                .HasForeignKey(stock => stock.VanId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(stock => stock.Product)
                .WithMany()
                .HasForeignKey(stock => stock.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
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

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasIndex(expense => new
            {
                expense.TenantId,
                expense.DateUtc
            });

            entity.HasIndex(expense => new
            {
                expense.TenantId,
                expense.StaffId
            });

            entity.Property(expense => expense.Category)
                .HasConversion<string>()
                .HasMaxLength(40);

            entity.Property(expense => expense.Description)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(expense => expense.Miles)
                .HasPrecision(10, 2);
        });

        modelBuilder.Entity<MileageRate>(entity =>
        {
            entity.HasIndex(rate => new
            {
                rate.TenantId,
                rate.EffectiveFromUtc
            });
        });

        modelBuilder.Entity<PushSubscription>(entity =>
        {
            entity.HasIndex(subscription => new
                {
                    subscription.TenantId,
                    subscription.UserId
                });

            entity.HasIndex(subscription => subscription.Endpoint)
                .IsUnique();

            entity.Property(subscription => subscription.Endpoint)
                .IsRequired()
                .HasMaxLength(2048);

            entity.Property(subscription => subscription.P256dh)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(subscription => subscription.Auth)
                .IsRequired()
                .HasMaxLength(500);
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

        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.ToTable("Workflows");

            entity.HasIndex(workflow => new { workflow.TenantId, workflow.EngineVersion });

            entity.Property(workflow => workflow.Name)
                .IsRequired()
                .HasMaxLength(180);

            entity.Property(workflow => workflow.DefinitionJson)
                .IsRequired();

            entity.Property(workflow => workflow.DiagramJson);

            entity.Property(workflow => workflow.EngineVersion)
                .HasDefaultValue(3);

            entity.Property(workflow => workflow.IsActive)
                .HasDefaultValue(true);
        });

        modelBuilder.Entity<Dashboard>(entity =>
        {
            entity.HasIndex(dashboard => dashboard.TenantId);

            entity.Property(dashboard => dashboard.Name)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(dashboard => dashboard.LayoutJson)
                .IsRequired();

            entity.HasMany(dashboard => dashboard.Widgets)
                .WithOne(widget => widget.Dashboard)
                .HasForeignKey(widget => widget.DashboardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DashboardWidget>(entity =>
        {
            entity.Property(widget => widget.Type)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(widget => widget.QueryJson)
                .IsRequired();

            entity.Property(widget => widget.PositionJson)
                .IsRequired();
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasIndex(company => new { company.TenantId, company.ParentCompanyId });

            entity.Property(company => company.Name)
                .IsRequired()
                .HasMaxLength(180);

            entity.Property(company => company.Type)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(company => company.IsActive)
                .HasDefaultValue(true);

            entity.HasOne(company => company.ParentCompany)
                .WithMany(company => company.Children)
                .HasForeignKey(company => company.ParentCompanyId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CompanyUser>(entity =>
        {
            entity.HasIndex(companyUser => new { companyUser.CompanyId, companyUser.UserId })
                .IsUnique();

            entity.Property(companyUser => companyUser.Role)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasOne(companyUser => companyUser.Company)
                .WithMany(company => company.Users)
                .HasForeignKey(companyUser => companyUser.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CompanySetting>(entity =>
        {
            entity.HasIndex(setting => new { setting.CompanyId, setting.SettingKey })
                .IsUnique();

            entity.Property(setting => setting.SettingKey)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(setting => setting.SettingValue)
                .IsRequired()
                .HasMaxLength(4000);

            entity.HasOne(setting => setting.Company)
                .WithMany(company => company.Settings)
                .HasForeignKey(setting => setting.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WebhookWorkflow>(entity =>
        {
            entity.HasIndex(workflow => new { workflow.TenantId, workflow.TriggerEvent, workflow.Enabled });

            entity.Property(workflow => workflow.Name)
                .IsRequired()
                .HasMaxLength(160);

            entity.Property(workflow => workflow.TriggerEvent)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(workflow => workflow.FilterJson)
                .IsRequired();

            entity.Property(workflow => workflow.TransformJson)
                .IsRequired();

            entity.Property(workflow => workflow.TargetUrl)
                .IsRequired()
                .HasMaxLength(2048);

            entity.Property(workflow => workflow.SignatureSecret)
                .IsRequired()
                .HasMaxLength(160);

            entity.HasMany(workflow => workflow.Deliveries)
                .WithOne(delivery => delivery.WebhookWorkflow)
                .HasForeignKey(delivery => delivery.WebhookWorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WebhookWorkflowDelivery>(entity =>
        {
            entity.HasIndex(delivery => new { delivery.Status, delivery.AvailableAtUtc });

            entity.HasIndex(delivery => new { delivery.TenantId, delivery.WebhookWorkflowId });

            entity.Property(delivery => delivery.EventName)
                .IsRequired()
                .HasMaxLength(120);

            entity.Property(delivery => delivery.PayloadJson)
                .IsRequired();

            entity.Property(delivery => delivery.Status)
                .IsRequired()
                .HasMaxLength(40);

            entity.Property(delivery => delivery.LastError)
                .HasMaxLength(1000);
        });

        modelBuilder.Entity<Job>(entity =>
        {
            entity.Property<int?>("CompanyId");
            entity.HasIndex("TenantId", "CompanyId");
        });
    }
}
