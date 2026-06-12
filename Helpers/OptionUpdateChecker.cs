using Optional;
using Optional.Unsafe;

namespace game_platform.Helpers;

public record UpdateCheckResult(bool ShouldUpdate, object? Value);

public static class OptionUpdateChecker
{
    public static UpdateCheckResult Check(object? field)
    {
        if (field == null) return new UpdateCheckResult(false, null);

        var type = field.GetType();
        var hasValueProp = type.GetProperty("HasValue");
        var value = type.GetMethod("get_Value",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic |
            System.Reflection.BindingFlags.Public).Invoke(field, null); // temporary solution

        if (hasValueProp != null && (bool)(hasValueProp.GetValue(field) ?? false))
        {
            return new UpdateCheckResult(true, value);
        }

        return new UpdateCheckResult(false, null);
    }
    
    
    public static bool ShouldDelete<T>(Option<T> field)
    {
        return field.HasValue && (field.ValueOrDefault() == null);
    }
}