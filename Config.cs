namespace game_platform;

public record Config
{
    public TelegramSection Telegram { get; init; } = null!;
    public record TelegramSection(string BotToken);
}