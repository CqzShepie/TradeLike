using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Contracts.Customers;

public sealed class CreateCustomerRequest
{
    [Required(ErrorMessage = "Customer name is required.")]
    [MaxLength(180, ErrorMessage = "Customer name must be 180 characters or fewer.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [MaxLength(255, ErrorMessage = "Email address must be 255 characters or fewer.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^\+?[0-9\s().-]{7,40}$", ErrorMessage = "Enter a valid phone number.")]
    [MaxLength(40, ErrorMessage = "Phone number must be 40 characters or fewer.")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Address is required.")]
    [MaxLength(500, ErrorMessage = "Address must be 500 characters or fewer.")]
    public string Address { get; set; } = string.Empty;

    [MaxLength(4000, ErrorMessage = "Notes must be 4000 characters or fewer.")]
    public string? Notes { get; set; }
}
