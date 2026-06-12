using game_platform.Models;
using game_platform.Repository;

namespace game_platform.Endpoints;

public class Users : IEndpointModule
{
    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/users");

        group.MapGet("", getUsers);

    }

    private static async Task<IResult> getUsers(game_platform.Repository.User users)
    {
        return Results.Json(await users.GetAllUsers());
    }
    
    
}