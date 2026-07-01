using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Models;

public class Expense
{
    public int Id { get; set; }

    public int TenantId { get; set; }

    public int StaffId { get; set; }

    public DateTime DateUtc { get; set; }

    public ExpenseCategory Category { get; set; }

    public int AmountPence { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public int? ReceiptFileId { get; set; }

    public decimal? Miles { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
