using System;
using API.DTOs;
using API.Entities;
using API.Extensions;
using API.Helpers;
using API.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class MessageRepository(AppDbContext context) : IMessageRepository
{
    public void AddGroup(Group group)
    {
        context.Groups.Add(group);
    }

    public void AddMessage(Message message)
    {
        context.Messages.Add(message);
    }

    public void DeleteMessage(Message message)
    {
        context.Messages.Remove(message);
    }

    public async Task<Connection?> GetConnection(string connectionId)
    {
        return await context.Connections.FindAsync(connectionId);
    }

    public async Task<Group?> GetGroupForConnection(string connectionId)
    {
        return await context.Groups
            .Include(x => x.Connections)
            .Where(x => x.Connections.Any(c => c.ConnectionId == connectionId))
            .FirstOrDefaultAsync();
    }

    public async Task<Message?> GetMessage(string messageId)
    {
        return await context.Messages.FindAsync(messageId);
    }

    public async Task<Group?> GetMessageGroup(string groupName)
    {
        return await context.Groups
            .Include(x => x.Connections)
            .FirstOrDefaultAsync(x => x.Name == groupName);
    }

    public async Task<PaginatedResult<ConversationDto>> GetConversationsForMember(ConversationParams conversationParams)
    {
        var memberId = conversationParams.MemberId!;

        var conversationItems = await context.Messages
            .Where(x =>
                (x.SenderId == memberId && x.SenderDeleted == false) ||
                (x.RecipientId == memberId && x.RecipientDeleted == false))
            .Select(x => new
            {
                OtherMemberId = x.SenderId == memberId ? x.RecipientId : x.SenderId,
                OtherMemberDisplayName = x.SenderId == memberId ? x.Recipient.DisplayName : x.Sender.DisplayName,
                OtherMemberImageUrl = x.SenderId == memberId ? x.Recipient.ImageUrl : x.Sender.ImageUrl,
                LastMessage = x.Content,
                LastMessageSent = x.MessageSent,
                LastMessageFromCurrentUser = x.SenderId == memberId,
                IsUnread = x.RecipientId == memberId && x.DateRead == null && x.RecipientDeleted == false
            })
            .ToListAsync();

        var conversations = conversationItems
            .GroupBy(x => x.OtherMemberId)
            .Select(group =>
            {
                var latestMessage = group.OrderByDescending(x => x.LastMessageSent).First();

                return new ConversationDto
                {
                    OtherMemberId = latestMessage.OtherMemberId,
                    OtherMemberDisplayName = latestMessage.OtherMemberDisplayName,
                    OtherMemberImageUrl = latestMessage.OtherMemberImageUrl,
                    LastMessage = latestMessage.LastMessage,
                    LastMessageSent = latestMessage.LastMessageSent,
                    LastMessageFromCurrentUser = latestMessage.LastMessageFromCurrentUser,
                    UnreadCount = group.Count(x => x.IsUnread)
                };
            })
            .OrderByDescending(x => x.LastMessageSent)
            .ToList();

        var totalCount = conversations.Count;
        var items = conversations
            .Skip((conversationParams.PageNumber - 1) * conversationParams.PageSize)
            .Take(conversationParams.PageSize)
            .ToList();

        return new PaginatedResult<ConversationDto>
        {
            Metadata = new PaginationMetadata
            {
                CurrentPage = conversationParams.PageNumber,
                TotalPages = (int)Math.Ceiling(totalCount / (double)conversationParams.PageSize),
                PageSize = conversationParams.PageSize,
                TotalCount = totalCount
            },
            Items = items
        };

    }

    public async Task<IReadOnlyList<MessageDto>> GetMessageThread(string currentMemberId, string recipientId)
    {
        await context.Messages
            .Where(x => x.RecipientId == currentMemberId && x.SenderId == recipientId && x.DateRead == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.DateRead, DateTime.UtcNow));

        return await context.Messages
            .Where(x => (x.RecipientId == currentMemberId && x.RecipientDeleted == false && x.SenderId == recipientId)
                    || (x.SenderId == currentMemberId && x.SenderDeleted == false && x.RecipientId == recipientId))
            .OrderBy(x => x.MessageSent)
            .Select(MessageExtensions.ToDtoProjection())
            .ToListAsync();
    }

    public async Task<int> GetUnreadMessageCount(string memberId)
    {
        return await context.Messages.CountAsync(x =>
            x.RecipientId == memberId &&
            x.DateRead == null &&
            x.RecipientDeleted == false);
    }

    public async Task RemoveConnection(string connectionId)
    {
        await context.Connections
            .Where(x => x.ConnectionId == connectionId)
            .ExecuteDeleteAsync();
    }

}
