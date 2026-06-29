using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string AdminEmail = "admin@tradelike.co.uk";
    private const string AdminPassword = "Password123!";

    private readonly JwtService _jwtService;

    public AuthController(JwtService jwtService)
    {
        _jwtService = jwtService;
    }

    public sealed record LoginRequest(
        string Email,
        string Password
    );

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var password = request.Password.Trim();

        if (email != AdminEmail || password != AdminPassword)
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }

        var token = _jwtService.GenerateToken(
            userId: 1,
            email: email);

        return Ok(new
        {
            token,
            user = new
            {
                id = 1,
                email,
                name = "TradeLike Admin"
            }
        });
    }
}