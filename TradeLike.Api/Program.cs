using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var message = context.ModelState
                .SelectMany(entry => entry.Value?.Errors ?? [])
                .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                    ? "The request is invalid."
                    : error.ErrorMessage)
                .FirstOrDefault() ?? "The request is invalid.";

            return new BadRequestObjectResult(new { error = message });
        };
    });

// Database
builder.Services.AddDbContext<TradeLikeDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("TradeLikeDatabase")));

// Application Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IQuoteService, QuoteService>();

// JWT
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwt = jwtSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration is required.");

ValidateJwtSettings(jwt);
var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"];
ValidateFrontendBaseUrl(frontendBaseUrl);
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? throw new InvalidOperationException("AllowedOrigins must be configured.");
ValidateAllowedOrigins(allowedOrigins);

builder.Services
    .AddOptions<JwtSettings>()
    .Bind(jwtSection)
    .Validate(settings => !GetJwtSettingsErrors(settings).Any(), "Jwt configuration is missing or invalid.")
    .ValidateOnStart();

builder.Services.AddSingleton<JwtService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwt.Key))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireEmployeeRole", policy =>
        policy.RequireRole(CustomerRoles.Employee, CustomerRoles.Manager, CustomerRoles.Director, "Customer"));

    options.AddPolicy("RequireManagerRole", policy =>
        policy.RequireRole(CustomerRoles.Manager, CustomerRoles.Director, "Customer"));

    options.AddPolicy("RequireDirectorRole", policy =>
        policy.RequireRole(CustomerRoles.Director));

    options.AddPolicy("RequireStaffRole", policy =>
        policy.RequireRole("Staff", "Director"));

    options.AddPolicy("RequireAdminRole", policy =>
        policy.RequireRole("Director"));

    options.AddPolicy("RequireCustomerRole", policy =>
        policy.RequireRole(CustomerRoles.Employee, CustomerRoles.Manager, CustomerRoles.Director, "Customer"));
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIpAddress(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));

    options.AddPolicy("auth-register", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIpAddress(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));

    options.AddPolicy("company-staff-invite", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIpAddress(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            }));
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    Name = "TradeLike API",
    Status = "Running",
    Environment = app.Environment.EnvironmentName
}));

app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    Time = DateTime.UtcNow
}));

app.Run();

static void ValidateJwtSettings(JwtSettings settings)
{
    var errors = GetJwtSettingsErrors(settings).ToArray();

    if (errors.Length > 0)
    {
        throw new InvalidOperationException(
            $"Jwt configuration is invalid: {string.Join("; ", errors)}");
    }
}

static IEnumerable<string> GetJwtSettingsErrors(JwtSettings settings)
{
    if (IsMissingOrPlaceholder(settings.Key))
    {
        yield return "Jwt:Key must be set in configuration or environment.";
    }
    else if (Encoding.UTF8.GetByteCount(settings.Key) < 32)
    {
        yield return "Jwt:Key must be at least 32 bytes.";
    }

    if (IsMissingOrPlaceholder(settings.Issuer))
    {
        yield return "Jwt:Issuer must be set in configuration or environment.";
    }

    if (IsMissingOrPlaceholder(settings.Audience))
    {
        yield return "Jwt:Audience must be set in configuration or environment.";
    }

    if (settings.ExpiryMinutes <= 0)
    {
        yield return "Jwt:ExpiryMinutes must be greater than zero.";
    }
}

static bool IsMissingOrPlaceholder(string value)
{
    return string.IsNullOrWhiteSpace(value) ||
        string.Equals(value, JwtSettings.EnvironmentPlaceholder, StringComparison.OrdinalIgnoreCase);
}

static void ValidateFrontendBaseUrl(string? baseUrl)
{
    if (string.IsNullOrWhiteSpace(baseUrl) ||
        string.Equals(baseUrl, JwtSettings.EnvironmentPlaceholder, StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Frontend:BaseUrl must be set in configuration or environment.");
    }

    if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var uri) ||
        (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
    {
        throw new InvalidOperationException("Frontend:BaseUrl must be an absolute HTTP or HTTPS URL.");
    }
}

static void ValidateAllowedOrigins(IReadOnlyCollection<string> origins)
{
    if (origins.Count == 0)
    {
        throw new InvalidOperationException("AllowedOrigins must contain at least one origin.");
    }

    foreach (var origin in origins)
    {
        if (string.IsNullOrWhiteSpace(origin) ||
            string.Equals(origin, JwtSettings.EnvironmentPlaceholder, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("AllowedOrigins entries must be set in configuration or environment.");
        }

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("AllowedOrigins entries must be absolute HTTP or HTTPS origins.");
        }
    }
}

static string GetClientIpAddress(HttpContext context)
{
    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
