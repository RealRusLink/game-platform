using game_platform.Models;

namespace game_platform.Endpoints;

public class Players : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/player");

        group.MapPost("", createPlayer);
        group.MapPatch("", updatePlayer);

    }

    private static IResult createPlayer(TelegramUser user, PlayerCreate player)
    {
        return Results.Json(player);
    }
        
    private static IResult updatePlayer(TelegramUser user, PlayerUpdate player)
    {
        return Results.Json(player);
    }
    
}