using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Security;

namespace TradeLike.Api.Api.RoutePlanner;

[ApiController]
[Authorize(Policy = "RequireEmployeeRole")]
[Route("api/routes")]
public sealed class RoutesController : ControllerBase
{
    private readonly GoogleRoutePlanner _routePlanner;

    public RoutesController(GoogleRoutePlanner routePlanner)
    {
        _routePlanner = routePlanner;
    }

    [HttpGet("daily")]
    public async Task<ActionResult<DailyRouteResponse>> GetDailyRoute(
        [FromQuery] DateTime date,
        [FromQuery] int? engineerId)
    {
        if (date == default)
        {
            return BadRequest(new { error = "A route date is required." });
        }

        var response = await _routePlanner.GetDailyRouteAsync(
            TenantHelpers.GetTenantId(HttpContext),
            date.Date,
            engineerId,
            HttpContext.RequestAborted);

        return Ok(response);
    }
}
