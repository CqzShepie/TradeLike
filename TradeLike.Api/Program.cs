using System.Text;
using System.Text.Json;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Context;
using Serilog.Events;
using Serilog.Sinks.ApplicationInsights.TelemetryConverters;
using Microsoft.ApplicationInsights.Extensibility;
using TradeLike.Api;
using TradeLike.Api.Configuration;
using TradeLike.Api.Data;
using TradeLike.Api.Observability;
using TradeLike.Api.Api.RoutePlanner;
using TradeLike.Api.Api.Payments;
using TradeLike.Api.Branding;
using TradeLike.Api.Companies;
using TradeLike.Api.Elastic;
using TradeLike.Api.PublicApi;
using TradeLike.Api.Security;
using TradeLike.Api.Services;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

var keyVaultUri = builder.Configuration["AZURE_VAULT_URI"];
if (builder.Configuration.GetValue("Features:KeyVault:Enabled", true) &&
    !string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(
        new Uri(keyVaultUri),
        new DefaultAzureCredential());
}

builder.Host.UseSerilog((context, _, configuration) =>
{
    configuration
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command",
            context.HostingEnvironment.IsDevelopment() ? LogEventLevel.Information : LogEventLevel.Warning)
        .Enrich.FromLogContext();

    if (context.HostingEnvironment.IsDevelopment())
    {
        configuration.WriteTo.Console();
        return;
    }

    var appInsightsKey = context.Configuration["APPINSIGHTS_KEY"];
    if (!string.IsNullOrWhiteSpace(appInsightsKey))
    {
        var telemetryConfiguration = TelemetryConfiguration.CreateDefault();
        telemetryConfiguration.ConnectionString = appInsightsKey.StartsWith("InstrumentationKey=", StringComparison.OrdinalIgnoreCase)
            ? appInsightsKey
            : $"InstrumentationKey={appInsightsKey}";

        configuration.WriteTo.ApplicationInsights(
            telemetryConfiguration,
            TelemetryConverter.Traces);
    }
});

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
var connectionString = GetConfiguredConnectionString(builder.Configuration, builder.Environment);
builder.Services.AddDbContext<TradeLikeDbContext>(options =>
{
    options.UseSqlServer(connectionString);

    if (builder.Environment.IsDevelopment())
    {
        options.LogTo(Console.WriteLine, LogLevel.Information);
    }
});

// Application Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IQuoteService, QuoteService>();
builder.Services.AddHttpClient<NotificationQueue>();
builder.Services.AddHttpClient(nameof(ElasticSyncHostedService));
builder.Services.AddHttpClient(nameof(SearchController));
builder.Services.AddHttpClient(nameof(WebhookDispatcher));
builder.Services.AddHttpClient(nameof(GoogleRoutePlanner));
builder.Services.AddHttpClient(nameof(PaymentsController));
builder.Services.AddHostedService<ElasticSyncHostedService>();
builder.Services.AddHostedService<WebhookDispatcher>();
var redisConnection = builder.Configuration["REDIS_CONN"];
if (!string.IsNullOrWhiteSpace(redisConnection))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConnection;
        options.InstanceName = "TradeLike:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddHttpClient<GoogleRoutePlanner>();
builder.Services.AddHttpClient();
builder.Services.AddHealthChecks()
    .AddCheck<SqlHealthCheck>("sql")
    .AddCheck<KeyVaultHealthCheck>("key_vault")
    .AddCheck<StripeHealthCheck>("stripe")
    .AddCheck<ElasticSearchHealthCheck>("elasticsearch")
    .AddCheck<ServiceBusHealthCheck>("service_bus")
    .AddCheck<SendGridHealthCheck>("sendgrid")
    .AddCheck<TwilioHealthCheck>("twilio")
    .AddCheck<ExternalServicesHealthCheck>("external_services");
builder.Services.Configure<HealthCheckPublisherOptions>(options =>
{
    options.Delay = TimeSpan.FromSeconds(15);
    options.Period = TimeSpan.FromMinutes(1);
    options.Predicate = _ => true;
});
builder.Services.AddSingleton<IHealthCheckPublisher, SlackHealthAlertPublisher>();

// JWT
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwt = jwtSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration is required.");

ValidateJwtSettings(jwt);
var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"];
ValidateFrontendBaseUrl(frontendBaseUrl);
if (!builder.Environment.IsDevelopment())
{
    ValidateRequiredSecret(builder.Configuration, "Stripe:SecretKey");
}
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
    /*
     * Backwards-compatible role policies.
     *
     * New customer-side roles:
     * - CustomerEmployee
     * - CustomerManager
     * - CustomerDirector
     *
     * Legacy roles still accepted so existing local/prod users do not get locked out:
     * - Customer
     * - Director
     * - Staff
     */

    options.AddPolicy("RequireCustomerRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.EmployeeRoles)));

    options.AddPolicy("RequireEmployeeRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.EmployeeRoles)));

    options.AddPolicy("RequireManagerRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.ManagerRoles)));

    options.AddPolicy("RequireLeaderRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.ManagerRoles)));

    options.AddPolicy("RequireDirectorRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.DirectorRoles)));

    options.AddPolicy("RequireAdminRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User, CustomerRoles.DirectorRoles)));

    options.AddPolicy("RequireStaffRole", policy =>
        policy.RequireAssertion(context => HasAnyRole(context.User,
            CustomerRoles.Staff,
            CustomerRoles.LegacyDirector,
            CustomerRoles.Director
        )));
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

app.UseMiddleware<WhiteLabelBrandingMiddleware>();
app.UseMiddleware<CompanyBranchFilterMiddleware>();
app.UseMiddleware<PublicApiGatewayMiddleware>();

app.UseAuthentication();
app.Use(async (context, next) =>
{
    using (LogContext.PushProperty("TenantId", context.User.FindFirst("tid")?.Value ?? "anonymous"))
    using (LogContext.PushProperty("UserId", context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous"))
    {
        await next();
    }
});
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            totalDuration = report.TotalDuration.TotalMilliseconds,
            checks = report.Entries.Select(entry => new
            {
                name = entry.Key,
                status = entry.Value.Status.ToString(),
                duration = entry.Value.Duration.TotalMilliseconds,
                description = entry.Value.Description,
                error = entry.Value.Exception?.Message
            })
        }));
    }
});

var startedAt = DateTimeOffset.UtcNow;
app.MapGet("/metrics", async (HealthCheckService healthChecks) =>
{
    var report = await healthChecks.CheckHealthAsync();
    var status = report.Status == HealthStatus.Healthy ? 1 : 0;
    var uptime = (DateTimeOffset.UtcNow - startedAt).TotalSeconds;

    return Results.Text(
        string.Join('\n',
            "# HELP tradelike_health_status 1 when healthy, 0 otherwise.",
            "# TYPE tradelike_health_status gauge",
            $"tradelike_health_status {status}",
            "# HELP tradelike_uptime_seconds API process uptime in seconds.",
            "# TYPE tradelike_uptime_seconds gauge",
            $"tradelike_uptime_seconds {uptime:F0}",
            string.Empty),
        "text/plain");
});

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

static bool IsMissingOrPlaceholder(string? value)
{
    return string.IsNullOrWhiteSpace(value) ||
        string.Equals(value, JwtSettings.EnvironmentPlaceholder, StringComparison.OrdinalIgnoreCase);
}

static string GetConfiguredConnectionString(IConfiguration configuration, IWebHostEnvironment environment)
{
    var defaultConnection = configuration.GetConnectionString("DefaultConnection");
    if (!IsMissingOrPlaceholder(defaultConnection))
    {
        return defaultConnection!;
    }

    if (!environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "ConnectionStrings:DefaultConnection must be set in configuration or environment.");
    }

    var legacyConnection = configuration.GetConnectionString("TradeLikeDatabase");
    if (!IsMissingOrPlaceholder(legacyConnection))
    {
        return legacyConnection!;
    }

    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection must be set in configuration or environment.");
}

static void ValidateRequiredSecret(IConfiguration configuration, string key)
{
    if (IsMissingOrPlaceholder(configuration[key]))
    {
        throw new InvalidOperationException($"{key} must be set in configuration or environment.");
    }
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

static bool HasAnyRole(ClaimsPrincipal user, params string[] allowedRoles)
{
    var allowed = allowedRoles
        .Select(CustomerRoles.Normalize)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    return user
        .FindAll(ClaimTypes.Role)
        .Concat(user.FindAll("role"))
        .Select(claim => CustomerRoles.Normalize(claim.Value))
        .Any(allowed.Contains);
}

static string GetClientIpAddress(HttpContext context)
{
    return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
