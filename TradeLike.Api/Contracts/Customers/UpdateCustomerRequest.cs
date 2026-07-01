using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Contracts.Customers;

public sealed class UpdateCustomerRequest
{
    [MaxLength(100, ErrorMessage = "Customer name must be 100 characters or fewer.")]
    public string? Name { get; set; }

    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [MaxLength(255, ErrorMessage = "Email address must be 255 characters or fewer.")]
    public string? Email { get; set; }

    [RegularExpression(@"^\+?[0-9\s().-]{7,30}$", ErrorMessage = "Enter a valid phone number.")]
    [MaxLength(30, ErrorMessage = "Phone number must be 30 characters or fewer.")]
    public string? Phone { get; set; }

    [MaxLength(250, ErrorMessage = "Address must be 250 characters or fewer.")]
    public string? Address { get; set; }

    [MaxLength(4000, ErrorMessage = "Notes must be 4000 characters or fewer.")]
    public string? Notes { get; set; }
}
