using game_platform.Models;
using MongoDB.Driver;

namespace game_platform.Repository;

public class User
{
    private readonly IMongoCollection<TelegramUser> _users;

    public User(IMongoDatabase database)
    {
        _users = database.GetCollection<TelegramUser>("Users");
    }

    public async Task RegisterUserIfNotExists(TelegramUser user)
    {
        await _users.ReplaceOneAsync(
            savedUser => savedUser.Id == user.Id,
            user,
            new ReplaceOptions { IsUpsert = true }
        );
    }

    public async Task<List<TelegramUser>> GetAllUsers()
    {
        return await _users.Find(user => true).ToListAsync();
    }
    
    
}