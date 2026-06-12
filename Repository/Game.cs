using game_platform.Helpers;
using game_platform.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace game_platform.Repository;

public class Game
{
    private readonly IMongoCollection<Models.Game> _games;

    public Game(IMongoDatabase database)
    {
        _games = database.GetCollection<Models.Game>("Games");
    }


    public async Task<List<string>> GamesIdsByAuthor(long authorId)
    {
        var games = await _games.Find(game => game.AuthorUserId == authorId).Project(game => game.Id).ToListAsync();
        return games ?? new List<string>();
    }

    public async Task<Models.GamePublic?> GetAuthorizedGame(string gameId, long authorId)
    {
        var game = await _games.Find(game => game.Id == gameId && game.AuthorUserId == authorId).FirstOrDefaultAsync();
        return game == null ? null : new GamePublic(game);
    }
    
    public async Task<bool?> DeleteAuthorizedGame(string gameId, long authorId)
    {
        var result = await _games.DeleteOneAsync(game => game.Id == gameId && game.AuthorUserId == authorId);
        return result.IsAcknowledged ? result is {DeletedCount: > 0} : null;
    }
    

    public async Task<Models.GamePublic> CreateGame(GameCreate game, long authorId)
    {
        Models.Game fullGame = new Models.Game(game, authorId, ObjectId.GenerateNewId().ToString());
        await _games.InsertOneAsync(fullGame);
        return new GamePublic(fullGame);
    }


    public async Task<Models.GamePublic?> UpdateGame(GameUpdate gameUpdate, string gameId, long authorId)
    {
        var filter = Builders<Models.Game>.Filter.And(
            Builders<Models.Game>.Filter.Eq(game => game.Id, gameId),
            Builders<Models.Game>.Filter.Eq(game => game.AuthorUserId, authorId)
        );
        
        var updates = new List<UpdateDefinition<Models.Game>>();
        var properties = typeof(GameUpdate).GetProperties();

        foreach (var property in properties)
        {
            var field = property.GetValue(gameUpdate);
            var checkResult = OptionUpdateChecker.Check(field); 
            if (checkResult.ShouldUpdate)
            {
                var value = checkResult.Value;
                updates.Add(Builders<Models.Game>.Update.Set(property.Name, value));
            }
        }

        if (updates.Count == 0)
        {
            var oldGame = await _games.Find(filter).FirstOrDefaultAsync();
            return oldGame == null ? null : new GamePublic(oldGame);
        }
        
        var options = new FindOneAndUpdateOptions<Models.Game, Models.Game>
        {
            ReturnDocument = ReturnDocument.After
        };
        
        var combinedUpdate = Builders<Models.Game>.Update.Combine(updates);
        var newGame = await _games.FindOneAndUpdateAsync(filter, combinedUpdate, options);
        return newGame == null ? null : new GamePublic(newGame);
    }
    
    
    
}