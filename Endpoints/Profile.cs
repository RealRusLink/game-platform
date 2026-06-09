using game_platform.Models;

namespace game_platform.Endpoints;

public class ProfileEndpoints : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/profile");

        group.MapGet("", getProfile);

    }

    private static IResult getProfile(TelegramUser user)
    {
        return Results.Json(user);
    }
    
}