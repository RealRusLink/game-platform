using game_platform.Models;
using Game = game_platform.Repository.Game;

namespace game_platform.Endpoints;

public class Players : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/games/{gameId}/players");

        group.MapPost("{playerId}", createPlayer);
        group.MapGet("{playerId}", getPlayer);
        group.MapDelete("{playerId}", deletePlayer);
        group.MapPatch("{playerId}", updatePlayer);

    }

    private static async Task<IResult> createPlayer(TelegramUser user, PlayerCreate player, string gameId, long playerId, Game games)
    {
        if (playerId == user.Id) return Results.BadRequest("Author can't be a player");
        var existingPlayer = await games.GetAuthorizedGamePlayer(gameId, user.Id, playerId);
        if (existingPlayer != null) return Results.BadRequest("Player already exists");
        var createdPlayer = await games.CreatePlayer(player, gameId, user.Id, playerId);
        return createdPlayer == null ? Results.NotFound() : Results.Json(createdPlayer);
    }
    
    private static async Task<IResult> getPlayer(TelegramUser user, string gameId, long playerId, Game games)
    {
        var existingPlayer = await games.GetAuthorizedGamePlayer(gameId, user.Id, playerId);
        return existingPlayer == null ? Results.NotFound() : Results.Json(existingPlayer);
    }
    
    private static async Task<IResult> deletePlayer(TelegramUser user, string gameId, long playerId, Game games)
    {
        var deleteResult = await games.DeletePlayer(gameId, user.Id, playerId);
        return deleteResult switch
        {
            null => Results.InternalServerError(),
            false => Results.NotFound(),
            true => Results.NoContent()
        };
    }
        
    private static async Task<IResult> updatePlayer(TelegramUser user, PlayerUpdate player, string gameId, long playerId, Game games)
    {
        var result = await games.UpdatePlayer(player, gameId, user.Id, playerId);
        return result switch
        {
            null => Results.NotFound(),
            _ => Results.Json(result)
        };
    }
    
}