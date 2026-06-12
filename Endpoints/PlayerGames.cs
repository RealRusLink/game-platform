using game_platform.Models;
using MongoDB.Bson.Serialization;
using Game = game_platform.Repository.Game;

namespace game_platform.Endpoints;

public class PlayerGames : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/player/games")
            .WithTags("Player (Self)")
            .WithOpenApi();

        group.MapGet("", getMyGames)
            .WithName("GetMyGames")
            .WithSummary("List games the current user is a player in")
            .Produces<List<GamePublic>>();

        group.MapGet("{gameId}", getMyself)
            .WithName("GetMySelf")
            .WithSummary("Get current player's profile and inventory in a game")
            .Produces<PlayerSelf>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPatch("{gameId}", updateMyName)
            .WithName("UpdateMyName")
            .WithSummary("Update own display name in a game")
            .Produces<PlayerPublic>()
            .Produces(StatusCodes.Status404NotFound);
    }

    private static async Task<IResult> getMyGames(TelegramUser user, Game games)
    {
        var result = await games.GetPlayerGames(user.Id);
        return Results.Json(result);
    }

    private static async Task<IResult> getMyself(TelegramUser user, string gameId, Game games)
    {
        var player = await games.GetPlayerSelf(gameId, user.Id);
        return player == null ? Results.NotFound() : Results.Json(new PlayerSelf(player));
    }

    private static async Task<IResult> updateMyName(TelegramUser user, string gameId, PlayerUpdate update, Game games)
    {
        var result = await games.UpdatePlayerSelf(update, gameId, user.Id);
        return result == null ? Results.NotFound() : Results.Json(result);
    }
}