using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeLike.Api.Data;

namespace TradeLike.Api.Controllers;

[ApiController]
[Authorize(Policy = "RequireCustomerRole")]          // ← changed (was RequireStaffRole)
[Route("api/job-assignments")]
public sealed class JobAssignmentsController : ControllerBase
{
    private readonly TradeLikeDbContext _context;

    public JobAssignmentsController(TradeLikeDbContext context)
    {
        _context = context;
    }

    // ─────────────────────────────────────────────────────────────────────
    // existing endpoints follow (unchanged) …
    // ─────────────────────────────────────────────────────────────────────
}