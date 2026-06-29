var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddControllers();

// Swagger / OpenAPI
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
                "https://gray-glacier-03cac3803.7.azurestaticapps.net"
)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

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