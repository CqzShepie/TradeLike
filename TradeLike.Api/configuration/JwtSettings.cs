namespace TradeLike.Api.Configuration;

public class JwtSettings
{
    public const string EnvironmentPlaceholder = "SET_IN_ENVIRONMENT";

    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; }
}
