using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Api.RoutePlanner;

public sealed class GoogleRoutePlanner
{
    private readonly TradeLikeDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public GoogleRoutePlanner(
        TradeLikeDbContext context,
        IDistributedCache cache,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<DailyRouteResponse> GetDailyRouteAsync(
        int tenantId,
        DateTime date,
        int? engineerId,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"routes:daily:{tenantId}:{date:yyyy-MM-dd}:{engineerId?.ToString(CultureInfo.InvariantCulture) ?? "all"}";
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            return JsonSerializer.Deserialize<DailyRouteResponse>(cached, JsonOptions)!;
        }

        var nextDay = date.Date.AddDays(1);
        var jobs = await _context.Jobs
            .AsNoTracking()
            .Where(job =>
                job.TenantId == tenantId &&
                job.ScheduledDate >= date.Date &&
                job.ScheduledDate < nextDay &&
                (!engineerId.HasValue || job.EngineerId == engineerId.Value))
            .OrderBy(job => job.ScheduledDate)
            .Select(job => new RouteStopResponse(
                job.Id,
                job.JobTitle,
                job.Customer,
                job.Address,
                job.ScheduledDate,
                job.EngineerId))
            .ToListAsync(cancellationToken);

        var response = await BuildGoogleRouteAsync(jobs, cancellationToken);

        await _cache.SetStringAsync(
            cacheKey,
            JsonSerializer.Serialize(response, JsonOptions),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            },
            cancellationToken);

        return response;
    }

    private async Task<DailyRouteResponse> BuildGoogleRouteAsync(
        IReadOnlyList<RouteStopResponse> jobs,
        CancellationToken cancellationToken)
    {
        var key = _configuration["GOOGLE_MAPS_KEY"];
        if (jobs.Count < 2 || string.IsNullOrWhiteSpace(key))
        {
            return new DailyRouteResponse(jobs, null, jobs.Count, 0);
        }

        var origin = Uri.EscapeDataString(jobs.First().Address);
        var destination = Uri.EscapeDataString(jobs.Last().Address);
        var waypoints = jobs.Count > 2
            ? "&waypoints=optimize:true|" + string.Join('|', jobs.Skip(1).SkipLast(1).Select(job => Uri.EscapeDataString(job.Address)))
            : string.Empty;

        var url = $"https://maps.googleapis.com/maps/api/directions/json?origin={origin}&destination={destination}{waypoints}&key={Uri.EscapeDataString(key)}";
        var client = _httpClientFactory.CreateClient(nameof(GoogleRoutePlanner));
        using var googleResponse = await client.GetAsync(url, cancellationToken);

        if (!googleResponse.IsSuccessStatusCode)
        {
            return new DailyRouteResponse(jobs, null, jobs.Count, 0);
        }

        using var stream = await googleResponse.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var route = document.RootElement.GetProperty("routes").EnumerateArray().FirstOrDefault();
        if (route.ValueKind == JsonValueKind.Undefined)
        {
            return new DailyRouteResponse(jobs, null, jobs.Count, 0);
        }

        var totalMeters = route.GetProperty("legs").EnumerateArray()
            .Sum(leg => leg.GetProperty("distance").GetProperty("value").GetInt32());

        var mapsUrl = $"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}";
        return new DailyRouteResponse(jobs, mapsUrl, jobs.Count, totalMeters);
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}

public sealed record DailyRouteResponse(
    IReadOnlyList<RouteStopResponse> Stops,
    string? MapsUrl,
    int StopCount,
    int TotalDistanceMeters);

public sealed record RouteStopResponse(
    int JobId,
    string JobTitle,
    string Customer,
    string Address,
    DateTime ScheduledDate,
    int? EngineerId);
