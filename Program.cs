using game_platform;
using game_platform.Endpoints;
using game_platform.Middleware;
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

#region Serve static
app.UseDefaultFiles();
app.UseStaticFiles();
#endregion

#region Register authentication middleware
app.UseMiddleware<TelegramAuthMiddleware>();
#endregion

#region Register all endpoints
var modules = typeof(IEndpointModule).Assembly.GetTypes()
    .Where(t => typeof(IEndpointModule).IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract)
    .Select(Activator.CreateInstance)
    .Cast<IEndpointModule>();
foreach (var module in modules)
{
    module.MapEndpoints(app);
}
#endregion


app.Run();


