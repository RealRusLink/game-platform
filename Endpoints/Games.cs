using game_platform.Models;

namespace game_platform.Endpoints;

public class Games : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/admin/games")            
            .WithTags("Games (Admin)")
            .WithOpenApi();
        
        group.MapGet("", getGames)
            .WithName("GetGames")
            .WithSummary("List IDs of all games created by the current author")
            .Produces<List<string>>();

        group.MapPost("", createGame)
            .WithName("CreateGame")
            .WithSummary("Create a new game")
            .Produces<GamePublic>(StatusCodes.Status200OK)
            .ProducesValidationProblem();

        group.MapGet("{gameId}", getGame)
            .WithName("GetGame")
            .WithSummary("Get a game by ID (author only)")
            .Produces<GamePublic>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPatch("{gameId}", updateGame)
            .WithName("UpdateGame")
            .WithSummary("Partially update game fields (author only)")
            .Produces<GamePublic>()
            .Produces(StatusCodes.Status404NotFound)
            .ProducesValidationProblem();

        group.MapDelete("{gameId}", deleteGame)
            .WithName("DeleteGame")
            .WithSummary("Delete a game (author only)")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

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