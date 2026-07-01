using System.ComponentModel.DataAnnotations;

namespace TradeLike.Api.Contracts.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NotPastDateAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is null)
        {
            return ValidationResult.Success;
        }

        if (value is not DateTime date)
        {
            return new ValidationResult(ErrorMessage ?? "Enter a valid date.");
        }

        return date.Date < DateTime.Today
            ? new ValidationResult(ErrorMessage ?? "Scheduled date cannot be in the past.")
            : ValidationResult.Success;
    }
}
