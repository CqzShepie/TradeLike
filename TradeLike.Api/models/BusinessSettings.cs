using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class BusinessSettings
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    [Required]
    [MaxLength(180)]
    public string BusinessName { get; set; } = "TradeLike";

    [MaxLength(180)]
    public string? LegalName { get; set; }

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    [MaxLength(220)]
    public string? AddressLine1 { get; set; }

    [MaxLength(220)]
    public string? AddressLine2 { get; set; }

    [MaxLength(120)]
    public string? Town { get; set; }

    [MaxLength(120)]
    public string? County { get; set; }

    [MaxLength(30)]
    public string? Postcode { get; set; }

    [MaxLength(120)]
    public string? Country { get; set; } = "United Kingdom";

    [MaxLength(40)]
    public string? Phone { get; set; }

    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(255)]
    public string? Website { get; set; }

    [MaxLength(60)]
    public string? VatNumber { get; set; }

    [MaxLength(60)]
    public string? CompanyNumber { get; set; }

    public decimal DefaultVatRate { get; set; } = 20m;

    [Required]
    [MaxLength(20)]
    public string QuotePrefix { get; set; } = "Q";

    [Required]
    [MaxLength(20)]
    public string InvoicePrefix { get; set; } = "INV";

    [MaxLength(1000)]
    public string? PaymentTerms { get; set; }

    public int QuoteExpiryDays { get; set; } = 30;

    [MaxLength(2000)]
    public string? DefaultQuoteNotes { get; set; }

    [MaxLength(2000)]
    public string? DefaultInvoiceNotes { get; set; }

    [MaxLength(255)]
    public string? ReplyToEmail { get; set; }

    [Required]
    [MaxLength(30)]
    public string DefaultJobPriority { get; set; } = "Normal";

    [Required]
    [MaxLength(30)]
    public string DefaultScheduleView { get; set; } = "Week";

    [Required]
    [MaxLength(40)]
    public string DefaultReportRange { get; set; } = "30d";

    public bool IncludeCompletedInReports { get; set; } = true;

    public bool IncludeArchivedInReports { get; set; }

    public int LowStockThreshold { get; set; } = 5;

    [MaxLength(20)]
    public string PurchaseOrderPrefix { get; set; } = "PO";

    [MaxLength(120)]
    public string? BankName { get; set; }

    [MaxLength(180)]
    public string? BankAccountName { get; set; }

    [MaxLength(20)]
    public string? BankSortCode { get; set; }

    [MaxLength(40)]
    public string? BankAccountNumber { get; set; }

    [MaxLength(2000)]
    public string? EmailFooter { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
