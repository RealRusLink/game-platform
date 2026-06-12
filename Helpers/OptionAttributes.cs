using System.ComponentModel.DataAnnotations;
using Optional;

namespace game_platform.Helpers;

public class OptionStringLengthAttribute : ValidationAttribute
{
    private readonly int _min;
    private readonly int _max;

    public OptionStringLengthAttribute(int max, int min = 0)
    {
        _max = max;
        _min = min;
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is Option<string> optionNonNull)
        {
            return optionNonNull.Match(
                some: str =>
                {
                    if (str.Length < _min || str.Length > _max)
                        return new ValidationResult($"Length must be from {_min} to {_max}", [validationContext.MemberName!]);
                    return ValidationResult.Success;
                },
                none: () => ValidationResult.Success
            );
        }

        if (value is Option<string?> optionNullable)
        {
            return optionNullable.Match(
                some: str =>
                {
                    if (str != null && (str.Length < _min || str.Length > _max))
                        return new ValidationResult($"Length must be from {_min} to {_max}", [validationContext.MemberName!]);
                    return ValidationResult.Success;
                },
                none: () => ValidationResult.Success
            );
        }

        return ValidationResult.Success;
    }
}

public class OptionNotNullAttribute<T> : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not Option<T> option) return ValidationResult.Success;

        return option.Match(
            some: v => v is null
                ? new ValidationResult("Value cannot be null", [validationContext.MemberName!])
                : ValidationResult.Success,
            none: () => ValidationResult.Success
        );
    }
}