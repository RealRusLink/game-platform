using game_platform.Models;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using Game = game_platform.Repository.Game;

namespace game_platform.Endpoints;

public class Players : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/admin/games/{gameId}/players/{playerId}")
            .WithTags("Players (Admin)")
            .WithOpenApi();

        group.MapPost("", createPlayer)
            .WithName("CreatePlayer")
            .WithSummary("Add a player to the game")
            .Produces<PlayerPublic>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("", getPlayer)
            .WithName("GetPlayer")
            .WithSummary("Get player data")
            .Produces<PlayerPublic>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("", deletePlayer)
            .WithName("DeletePlayer")
            .WithSummary("Remove a player from the game")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPatch("", updatePlayer)
            .WithName("UpdatePlayer")
            .WithSummary("Update a player's name (author action)")
            .Produces<PlayerPublic>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapGet("inventory", getInventory)
            .WithName("GetInventory")
            .WithSummary("Get the player's inventory")
            .Produces<object>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPut("inventory", saveInventory)
            .WithName("SaveInventory")
            .WithSummary("Fully replace the player's inventory")
            .Produces<object>()
            .Produces(StatusCodes.Status404NotFound)    
            .WithOpenApi(op =>
            {
                op.RequestBody.Description = 
                    "Full player inventory as a JSON object following the inventory contract";
                return op;
            })
            .ProducesValidationProblem();
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
    
    
    private static async Task<IResult> getInventory(TelegramUser user, string gameId, long playerId, Game games)
    {
        var inventory = await games.GetInventory(gameId, user.Id, playerId);
        return inventory == null ? Results.NotFound() : Results.Json(BsonSerializer.Deserialize<object>(inventory));
    }

    private static async Task<IResult> saveInventory(TelegramUser user, InventoryUpdate body, string gameId, long playerId, Game games)
    {
        var bsonDoc = BsonDocument.Parse(body.Inventory.ToJsonString());
        var result = await games.SaveInventory(gameId, user.Id, playerId, bsonDoc);
        return result == null ? Results.NotFound() : Results.Json(BsonSerializer.Deserialize<object>(result));
    }
    
    
}