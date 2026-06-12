using game_platform.Models;

namespace game_platform.Endpoints;

public class ProfileEndpoints : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/profile")
            .WithTags("Profile")
            .WithOpenApi();

        group.MapGet("", getProfile)
            .WithName("GetProfile")
            .WithSummary("Get the currently authenticated user")
            .Produces<TelegramUser>();

    }

    private static IResult getProfile(TelegramUser user)
    {
        return Results.Json(user);
    }
    
}