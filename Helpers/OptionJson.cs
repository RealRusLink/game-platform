using System.Text.Json;
using System.Text.Json.Serialization;
using Optional;

public class OptionJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Option<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        Type valueType = typeToConvert.GetGenericArguments()[0];
        return (JsonConverter)Activator.CreateInstance(
            typeof(OptionJsonConverter<>).MakeGenericType(valueType))!;
    }
}

public class OptionJsonConverter<T> : JsonConverter<Option<T>>
{
    public override Option<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        T? value = JsonSerializer.Deserialize<T>(ref reader, options);
        return Option.Some(value!);
    }

    public override void Write(Utf8JsonWriter writer, Option<T> value, JsonSerializerOptions options)
    {
        value.Match(
            some: v => JsonSerializer.Serialize(writer, v, options),
            none: () => writer.WriteNullValue()
        );
    }
}