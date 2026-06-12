using game_platform.Models;
using game_platform.Repository;

namespace game_platform.Endpoints;

public class Users : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/users")
            .WithTags("Users")
            .WithOpenApi();

        group.MapGet("", getUsers)
            .WithName("GetAllUsers")
            .WithSummary("List all registered users")
            .Produces<List<TelegramUser>>();

    }

    private static async Task<IResult> getUsers(game_platform.Repository.User users)
    {
        return Results.Json(await users.GetAllUsers());
    }
    
    
}