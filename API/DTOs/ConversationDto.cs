namespace API.DTOs;

public class ConversationDto
{
    public required string OtherMemberId { get; set; }
    public required string OtherMemberDisplayName { get; set; }
    public string? OtherMemberImageUrl { get; set; }
    public required string LastMessage { get; set; }
    public DateTime LastMessageSent { get; set; }
    public bool LastMessageFromCurrentUser { get; set; }
    public int UnreadCount { get; set; }
}
