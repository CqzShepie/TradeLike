namespace TradeLike.Api.Api.Localization;

public sealed class TradeLikeLocalizationOptions
{
    public string DefaultLocale { get; init; } = "en-GB";

    public IReadOnlyList<string> EnabledLocales { get; init; } = ["en-GB", "fr-FR", "es-ES"];

    public static TradeLikeLocalizationOptions FromConfiguration(IConfiguration configuration)
    {
        var enabled = (configuration["ENABLED_LOCALES"] ?? "en-GB,fr-FR,es-ES")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return new TradeLikeLocalizationOptions
        {
            DefaultLocale = configuration["DEFAULT_LOCALE"] ?? "en-GB",
            EnabledLocales = enabled.Length == 0 ? ["en-GB"] : enabled
        };
    }
}
