using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;
using game_platform.Helpers;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using Optional;

namespace game_platform.Models;


public class PlayerUpdate
{
    [OptionNotNull<string>]
    [OptionStringLength(max: 20, min: 3)]
    public required Option<string> Name { get; set; }
}


public class PlayerCreate
{
    [Required]
    [StringLength(maximumLength: 20, MinimumLength = 3)]
    public required string Name { get; set; }
}



public class PlayerPublic
{
    public string Name { get; set; }
    public long UserId { get; set; }
    
    public PlayerPublic(Player player)
    {
        Name = player.Name;
        UserId = player.UserId;
    }
    
    
}



public class Player
{
    public long UserId { get; set; }
    public string Name { get; set; }
    public BsonDocument Inventory { get; set; }
    
    public Player(PlayerCreate player, long playerId)
    {
        Name = player.Name;
        UserId = playerId;
        Inventory = new BsonDocument();
    }

}

public class InventoryUpdate
{
    public required JsonNode Inventory { get; set; }
}

public class PlayerSelf
{
    public string Name { get; set; }
    public object? Inventory { get; set; }

    public PlayerSelf(Player player)
    {
        Name = player.Name;
        Inventory = player.Inventory == null
            ? null
            : BsonSerializer.Deserialize<object>(player.Inventory);
    }
}


