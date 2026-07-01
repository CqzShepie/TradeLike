using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Company
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int? ParentCompanyId { get; set; }

    public Company? ParentCompany { get; set; }

    public List<Company> Children { get; set; } = new();

    [Required]
    [MaxLength(180)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(40)]
    public string Type { get; set; } = "Branch";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<CompanyUser> Users { get; set; } = new();

    public List<CompanySetting> Settings { get; set; } = new();
}

public class CompanyUser
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public Company? Company { get; set; }

    public int UserId { get; set; }

    public CompanyRole Role { get; set; } = CompanyRole.Staff;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class CompanySetting
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public Company? Company { get; set; }

    [Required]
    [MaxLength(120)]
    public string SettingKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string SettingValue { get; set; } = string.Empty;
}

public enum CompanyRole
{
    Owner,
    Manager,
    Staff
}
