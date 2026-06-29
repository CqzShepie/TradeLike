using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("Jwt"));

builder.Services.AddSingleton<JwtService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration
            .GetSection("Jwt")
            .Get<JwtSettings>()!;

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

builder.Services.AddAuthorization();

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