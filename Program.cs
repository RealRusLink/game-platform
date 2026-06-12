using System.Reflection;
using System.Text.Json;
using game_platform;
using game_platform.Endpoints;
using game_platform.Middleware;
using game_platform.Repository;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

#region Register config

builder.Services.AddOptions<AppConfig>()
    .Bind(builder.Configuration.GetSection("AppConfig"))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton<AppConfig>(sp => sp.GetRequiredService<IOptions<AppConfig>>().Value);


Type rootType = typeof(AppConfig);
PropertyInfo[] properties = rootType.GetProperties();
foreach (PropertyInfo property in properties)
{
    if (property.PropertyType.Namespace == "System" && !property.PropertyType.IsGenericType)
    {
        continue;
    }
    Type nestedType = property.PropertyType;
    builder.Services.AddSingleton(nestedType, sp =>
    {
        AppConfig rootConfig = sp.GetRequiredService<AppConfig>();
        object? nestedConfig = property.GetValue(rootConfig);
        if (nestedConfig == null)
        {
            throw new InvalidOperationException($"Config {property.Name} is null.");
        }
        return nestedConfig;    
    });
}

#endregion

builder.Services.AddOpenApi();
builder.Services.AddValidation();


builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new OptionJsonConverterFactory());
    options.SerializerOptions.PropertyNamingPolicy = null;
});

builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions.Remove("exception");
    };
});

#region Register DB

builder.Services.AddSingleton<IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<MongoConfig>(); 
    return new MongoClient(settings.ConnectionString);
});

builder.Services.AddScoped(sp =>
{
    var settings = sp.GetRequiredService<MongoConfig>();
    return sp.GetRequiredService<IMongoClient>().GetDatabase(settings.DatabaseName);
});

#endregion

#region Register repositories

builder.Services.AddScoped<game_platform.Repository.User>();
builder.Services.AddScoped<game_platform.Repository.Game>();

#endregion

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


