using Microsoft.AspNetCore.Mvc;

namespace TradeLike.Api.Api.Localization;

[ApiController]
[Route("api/localization")]
public sealed class LocalizationController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public LocalizationController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("locales")]
    public ActionResult<LocaleResponse> GetLocales()
    {
        var options = TradeLikeLocalizationOptions.FromConfiguration(_configuration);

        return Ok(new LocaleResponse
        {
            DefaultLocale = options.DefaultLocale,
            EnabledLocales = options.EnabledLocales
        });
    }
}

public sealed class LocaleResponse
{
    public string DefaultLocale { get; init; } = "en-GB";

    public IReadOnlyList<string> EnabledLocales { get; init; } = [];
}
