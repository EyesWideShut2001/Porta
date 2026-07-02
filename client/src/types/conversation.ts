export type Conversation = {
  otherMemberId: string;
  otherMemberDisplayName: string;
  otherMemberImageUrl: string;
  lastMessage: string;
  lastMessageSent: string;
  lastMessageFromCurrentUser: boolean;
  unreadCount: number;
};
