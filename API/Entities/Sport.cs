using System;

namespace API.Entities;

public class Sport
{
    public int Id { get; set; }
    public string Nume { get; set; }


    // Navigation
    public List<Member> Members { get; set; } = new();
}
