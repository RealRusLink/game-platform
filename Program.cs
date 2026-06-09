using game_platform;
using game_platform.Middleware;
using game_platform.Models;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

var config = builder.Configuration.Get<Config>() ??
    throw new Exception("Bad config");

builder.Services.AddSingleton(config);

builder.Services.AddTransient(sp => sp.GetRequiredService<Config>().Telegram);

builder.Services.AddOpenApi();


builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});


var app = builder.Build();

app.UseForwardedHeaders();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseMiddleware<TelegramAuthMiddleware>();

app.MapGet("/api/pingpong", (TelegramUser user) 
    => Results.Json(user))
    .WithName("PingPong");

app.Run();


