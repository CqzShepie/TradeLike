var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// OpenAPI (optional)
builder.Services.AddOpenApi();

// ✅ ADD CORS (THIS FIXES YOUR ERROR)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// HTTPS redirect (keep if you want)
app.UseHttpsRedirection();

// ✅ ENABLE CORS (IMPORTANT)
app.UseCors("AllowFrontend");

// Your test endpoint (keep it)
app.MapGet("/weatherforecast", () =>
{
    return "Weather still works";
});

// Controllers
app.MapControllers();

app.Run();