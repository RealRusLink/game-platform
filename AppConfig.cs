namespace game_platform;

using System.ComponentModel.DataAnnotations;

public class AppConfig
{
    [Required]
    public MongoConfig MongoConfig { get; set; } = null!;

    [Required]
    public TelegramConfig TelegramConfig { get; set; } = null!;
}

public class MongoConfig
{
    [Required]
    [Url]
    public string ConnectionString { get; set; } = null!;

    [Required]
    public string DatabaseName { get; set; } = null!;
}

public class TelegramConfig
{
    [Required]
    public string BotToken { get; set; } = null!;

    [Required] 
    public int AuthTokenExpireAge { get; set; }
}