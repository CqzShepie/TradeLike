using System.Globalization;
using System.Resources;

namespace TradeLike.Api.Api.Localization;

public static class LocalizedValidationMessages
{
    private static readonly ResourceManager ResourceManager = new(
        "TradeLike.Api.Resources.ValidationMessages",
        typeof(LocalizedValidationMessages).Assembly);

    public static string Required(string fieldName)
    {
        var template = ResourceManager.GetString("Required") ?? "{0} is required.";

        return string.Format(CultureInfo.CurrentUICulture, template, fieldName);
    }

    public static string InvalidDate()
    {
        return ResourceManager.GetString("InvalidDate", CultureInfo.CurrentUICulture) ??
            "Date value is invalid.";
    }
}
