using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;
using TradeLike.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

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
    options.AddPolicy("RequireCustomerRole", policy =>
        policy.RequireRole("Customer", "Director"));

    options.AddPolicy("RequireStaffRole", policy =>
        policy.RequireRole("Staff", "Director"));

    options.AddPolicy("RequireAdminRole", policy =>
        policy.RequireRole("Director"));
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
            .WithOrigins(
                "http://localhost:5173",
                "https://app.tradelike.co.uk",
                "https://gray-glacier-03cac3803.7.azurestaticapps.net")
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

static string GetClientIpAddress(HttpContext context)
{
    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
