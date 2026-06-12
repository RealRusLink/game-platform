using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;
using game_platform.Helpers;
using Optional;

namespace game_platform.Models;


public class PlayerUpdate
{
    [OptionNotNull<JsonObject>]
    [OptionStringLength(max: 20, min: 3)]
    public Option<string> Name { get; set; }

    [OptionNotNull<JsonObject>]
    public Option<JsonObject> Inventory { get; set; }
}


public class PlayerCreate
{
    [StringLength(maximumLength: 20, MinimumLength = 3)]
    public required string Name { get; set; }
}


public class Player
{
    public long UserId { get; set; }
    public string Name { get; set; }
    public JsonObject Inventory { get; set; }
}


