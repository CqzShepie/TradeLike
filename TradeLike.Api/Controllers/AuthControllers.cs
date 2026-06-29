using Microsoft.AspNetCore.Mvc;
using TradeLike.Api.Services;

namespace TradeLike.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly JwtService _jwtService;

    public AuthController(JwtService jwtService)
    {
        _jwtService = jwtService;
    }

    public record LoginRequest(string Email, string Password);

    [HttpPost("login")]
    public IActionResult Login(LoginRequest request)
    {
        // Temporary login until database/users are added
        if (request.Email != "admin@tradelike.co.uk" ||
            request.Password != "Password123!")
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }

        var token = _jwtService.GenerateToken(
            userId: 1,
            email: request.Email);

        return Ok(new
        {
            token,
            user = new
            {
                id = 1,
                email = request.Email,
                name = "TradeLike Admin"
            }
        });
    }
}