using System.ComponentModel.DataAnnotations;
using game_platform.Helpers;
using Optional;

namespace game_platform.Models;

public class Game
{
    public string Name { get; set; }
    public string Description { get; set; }
    public long AuthorUserId { get; set; }
    public List<Player> Players { get; set; }
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
    public Option<string> Name { get; set; }  
    [OptionStringLength(max:160, min: 0)]
    public Option<string> Description { get; set; }
}