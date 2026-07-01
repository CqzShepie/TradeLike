using System.Globalization;

namespace TradeLike.Api.Api.Localization;

public sealed class AcceptLanguageMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TradeLikeLocalizationOptions _options;

    public AcceptLanguageMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _options = TradeLikeLocalizationOptions.FromConfiguration(configuration);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var locale = ResolveLocale(context.Request.Headers.AcceptLanguage.ToString());
        var culture = CultureInfo.GetCultureInfo(locale);
        var previousCulture = CultureInfo.CurrentCulture;
        var previousUiCulture = CultureInfo.CurrentUICulture;

        CultureInfo.CurrentCulture = culture;
        CultureInfo.CurrentUICulture = culture;

        try
        {
            await _next(context);
        }
        finally
        {
            CultureInfo.CurrentCulture = previousCulture;
            CultureInfo.CurrentUICulture = previousUiCulture;
        }
    }

    private string ResolveLocale(string acceptLanguage)
    {
        var requested = acceptLanguage
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => value.Split(';', 2)[0])
            .FirstOrDefault(value => _options.EnabledLocales.Contains(value, StringComparer.OrdinalIgnoreCase));

        return requested ?? _options.DefaultLocale;
    }
}
