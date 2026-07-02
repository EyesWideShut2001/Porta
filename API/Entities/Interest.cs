using System.Text.Json.Serialization;

namespace API.Entities;

public class Interest
{
    public int Id { get; set; }
    public required string Name { get; set; }

    [JsonIgnore]
    public List<Member> Members { get; set; } = [];
}
