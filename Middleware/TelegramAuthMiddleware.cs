using game_platform.Models;

namespace game_platform.Middleware;

public class TelegramAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        ctx.Items.Add("TelegramUser", new TelegramUser(
            Id: 10,
            FirstName: "Ruslan",
            LastName: "Or not",
            Username: "RealRusLink",
            LanguageCode: "en"));
        await next(ctx);
    }
    
}