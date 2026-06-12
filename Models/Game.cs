using System.ComponentModel.DataAnnotations;
using System.Reflection;
using game_platform.Helpers;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Optional;

namespace game_platform.Models;

public class Game
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public long AuthorUserId { get; set; }
    public List<Player> Players { get; set; }

    private static readonly PropertyInfo[] GameCreateProps = typeof(GameCreate).GetProperties();
    private static readonly string[] Blacklist = ["Id", "AuthorUserId", "Players"];

    public Game(GameCreate game, long authorUserId, string id)
    {
        Id = id;
        AuthorUserId = authorUserId;
        Players = new List<Player>();

        var targetProps = this.GetType().GetProperties();

        foreach (var sourceProp in GameCreateProps)
        {
            var targetProp = targetProps.FirstOrDefault(p => p.Name == sourceProp.Name);
            if (targetProp != null && targetProp.CanWrite && !Blacklist.Contains(targetProp.Name))
            {
                if (targetProp.PropertyType.IsAssignableFrom(sourceProp.PropertyType))
                {
                    var value = sourceProp.GetValue(game);
                    targetProp.SetValue(this, value);
                }
            }
        }
    }
}

public class GamePublic
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public long AuthorUserId { get; set; }
    public List<long> Players { get; set; }

    private static readonly PropertyInfo[] GameProps = typeof(Game).GetProperties();
    private static readonly string[] Blacklist = ["Players"];

    public GamePublic(Game game)
    {
        Players = game.Players?.Select(p => p.UserId).ToList() ?? new List<long>();
        var targetProps = this.GetType().GetProperties();
        foreach (var sourceProp in GameProps)
        {
            var targetProp = targetProps.FirstOrDefault(p => p.Name == sourceProp.Name);
            
            if (targetProp != null && targetProp.CanWrite && !Blacklist.Contains(targetProp.Name))
            {
                if (targetProp.PropertyType.IsAssignableFrom(sourceProp.PropertyType))
                {
                    var value = sourceProp.GetValue(game);
                    targetProp.SetValue(this, value);
                }
            }
        }
    }
}

public class GameCreate
 {
     [StringLength(maximumLength: 20, MinimumLength = 3)]
     public required string Name { get; set; }
     [StringLength(maximumLength: 160, MinimumLength = 0)]
     public required string Description { get; set; }
 }
 
 public class GameUpdate
 {
     [OptionStringLength(max:20, min: 3)]
     [OptionNotNull<string>]
     public Option<string> Name { get; set; }  
     [OptionStringLength(max:160, min: 0)]
     [OptionNotNull<string>]
     public Option<string> Description { get; set; }
 }