using game_platform.Models;

namespace game_platform.Endpoints;

public class Games : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/games");
        
        group.MapGet("", getGames);
        group.MapPost("", createGame);
        group.MapGet("{gameId}", getGame);
        group.MapPatch("{gameId}", updateGame);
        group.MapDelete("{gameId}", deleteGame);

    }
    private static async Task<IResult> getGames(TelegramUser user, Repository.Game gamesRepo)
    {
        return Results.Json(await gamesRepo.GamesIdsByAuthor(user.Id));
    }
    
    private static async Task<IResult> createGame(TelegramUser user, GameCreate gameCreate, Repository.Game gamesRepo)
    {
        return Results.Json(await gamesRepo.CreateGame(gameCreate, user.Id));
    }
    
    
    private static async Task<IResult> getGame(TelegramUser user, Repository.Game gamesRepo, string gameId)
    {
        var game = await gamesRepo.GetAuthorizedGame(gameId, user.Id);
        return game switch
        {
            null => Results.NotFound(),
            _ => Results.Json(game)
        };
    }
        
    private static async Task<IResult> updateGame(TelegramUser user, Repository.Game gamesRepo, string gameId, GameUpdate gameUpdate)
    {
        var game = await gamesRepo.UpdateGame(gameUpdate, gameId, user.Id);
        return game switch
        {
            null => Results.NotFound(),
            _ => Results.Json(game)
        };
    }
    
    private static async Task<IResult> deleteGame(TelegramUser user, Repository.Game gamesRepo, string gameId)
    {
        var deleteResult = await gamesRepo.DeleteAuthorizedGame(gameId, user.Id);
        return deleteResult switch
        {
            null => Results.InternalServerError(),
            false => Results.NotFound(),
            true => Results.NoContent()
        };
    }
    
}