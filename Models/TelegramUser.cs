using System.Reflection;
using System.Text.Json.Serialization;

namespace game_platform.Models;

public record TelegramUser(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("first_name")]
    string FirstName,
    [property: JsonPropertyName("last_name")]
    string? LastName,
    [property: JsonPropertyName("username")]
    string? Username,
    [property: JsonPropertyName("language_code")]
    string? LanguageCode
)
{
    public static ValueTask<TelegramUser> BindAsync(HttpContext context, ParameterInfo parameter)
    {
        var user = context.Items["TelegramUser"] as TelegramUser ?? throw new Exception("Auth middleware failed");
        return ValueTask.FromResult(user);
    }
};