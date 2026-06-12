using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Web;
using game_platform.Models;
using game_platform.Repository;

namespace game_platform.Middleware;

public class TelegramAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly int _maxage;
    private readonly byte[] _botTokenHash;
    public TelegramAuthMiddleware(RequestDelegate next, TelegramConfig tg)
    {
        _next = next;
        using var hmac = new HMACSHA256("WebAppData"u8.ToArray());
        _botTokenHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(tg.BotToken));
        _maxage = tg.AuthTokenExpireAge;
    }
    public async Task InvokeAsync(HttpContext context, game_platform.Repository.User users)
    {
        string? authHeader = context.Request.Headers["Authorization"];

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("tma "))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return; 
        }

        string initData = authHeader["tma ".Length..];

        if (!TryVerifyAndParse(initData, out TelegramUser? user))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        await users.RegisterUserIfNotExists(user);
        context.Items["TelegramUser"] = user;
        await _next(context);
    }
    
    private bool TryVerifyAndParse(string initData, out TelegramUser? user)
    {
        user = null;
        var parsedValues = HttpUtility.ParseQueryString(initData);

        #region 1. Time validation
        string? authDate = parsedValues["auth_date"];
        if (string.IsNullOrEmpty(authDate) || !long.TryParse(authDate, out long authDateUnix))
        {
            return false;
        }
        var authTime = DateTimeOffset.FromUnixTimeSeconds(authDateUnix);
        var currentTime = DateTimeOffset.UtcNow;

        if (currentTime - authTime > TimeSpan.FromHours(_maxage))
        {
            return false; 
        }
        
        #endregion

        #region 2. Sign validation

        string? receivedHash = parsedValues["hash"];
        if (string.IsNullOrEmpty(receivedHash)) return false;
        var dataParameters = parsedValues.AllKeys
            .Where(k => k != "hash" && k != null)
            .Select(k => $"{k}={parsedValues[k]}")
            .OrderBy(s => s)
            .ToList();
        string dataCheckString = string.Join("\n", dataParameters);
        using var hmac = new HMACSHA256(_botTokenHash);
        var calculatedHashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataCheckString));
        string calculatedHash = Convert.ToHexString(calculatedHashBytes).ToLower();
        if (calculatedHash != receivedHash) return false;
        
        #endregion
        
        string? userJson = parsedValues["user"];
        if (string.IsNullOrEmpty(userJson)) return false;
        user = JsonSerializer.Deserialize<TelegramUser>(userJson);
        return user != null;
    }
    
}