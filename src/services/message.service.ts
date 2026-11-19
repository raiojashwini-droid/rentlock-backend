import { prisma } from '../config/database.js';
import { AuthUserPayload } from '../types/index.js';

export class MessageService {
  static async listThreads(user: AuthUserPayload) {
    const threads = await prisma.messageThread.findMany({
      where: {
        OR: [{ participant1Id: user.id }, { participant2Id: user.id }],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const otherParticipantIds = Array.from(
      new Set(
        threads.map((th) => (th.participant1Id === user.id ? th.participant2Id : th.participant1Id))
      )
    );

    const otherUsers = await prisma.user.findMany({
      where: { id: { in: otherParticipantIds } },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    const userMap = new Map(otherUsers.map((u) => [u.id, u]));

    return threads.map((th) => {
      const otherId = th.participant1Id === user.id ? th.participant2Id : th.participant1Id;
      const otherUser = userMap.get(otherId) || null;
      return {
        id: th.id,
        participant1Id: th.participant1Id,
        participant2Id: th.participant2Id,
        otherUser,
        subject: th.subject,
        lastMessage: th.messages[0]?.content || '',
        lastMessageAt: th.lastMessageAt,
        unreadCount: th.messages.filter((m) => !m.isRead && m.senderId !== user.id).length,
      };
    });
  }

  static async getThreadMessages(threadId: number) {
    return prisma.message.findMany({
      where: { threadId },
      include: {
        sender: { select: { id: true, name: true, role: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getMessagesByContact(contactId: number, user: AuthUserPayload) {
    let targetUserId = contactId;

    // If contactId is tenant record id, lookup tenant's user profile id
    const tenant = await prisma.tenant.findUnique({ where: { id: contactId } });
    if (tenant?.userId) {
      targetUserId = tenant.userId;
    }

    const thread = await prisma.messageThread.findFirst({
      where: {
        OR: [
          { participant1Id: user.id, participant2Id: targetUserId },
          { participant1Id: targetUserId, participant2Id: user.id },
        ],
      },
    });

    if (!thread) {
      return { threadId: null, messages: [] };
    }

    const messages = await MessageService.getThreadMessages(thread.id);
    return { threadId: thread.id, messages };
  }

  static async sendMessage(data: any, sender: AuthUserPayload) {
    let threadId = data.threadId;
    let recipientUserId = Number(data.recipientId);

    // If recipientUserId corresponds to tenant record, map to tenant.userId
    const tenant = await prisma.tenant.findUnique({ where: { id: recipientUserId } });
    if (tenant?.userId) {
      recipientUserId = tenant.userId;
    }

    // Verify recipient user exists in DB
    const recipientUser = await prisma.user.findUnique({ where: { id: recipientUserId } });
    if (!recipientUser && data.recipientEmail) {
      const byEmail = await prisma.user.findUnique({
        where: { email: String(data.recipientEmail).toLowerCase().trim() },
      });
      if (byEmail) recipientUserId = byEmail.id;
    }

    if (!threadId) {
      const existingThread = await prisma.messageThread.findFirst({
        where: {
          OR: [
            { participant1Id: sender.id, participant2Id: recipientUserId },
            { participant1Id: recipientUserId, participant2Id: sender.id },
          ],
        },
      });

      if (existingThread) {
        threadId = existingThread.id;
        await prisma.messageThread.update({
          where: { id: threadId },
          data: { lastMessageAt: new Date() },
        });
      } else {
        const newThread = await prisma.messageThread.create({
          data: {
            participant1Id: sender.id,
            participant2Id: recipientUserId,
            lastMessageAt: new Date(),
          },
        });
        threadId = newThread.id;
      }
    } else {
      await prisma.messageThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date() },
      });
    }

    return prisma.message.create({
      data: {
        threadId,
        senderId: sender.id,
        content: data.content,
        attachmentUrls: data.attachmentUrls ? JSON.stringify(data.attachmentUrls) : null,
        isRead: false,
      },
      include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });
  }

  static async markThreadRead(threadId: number, user: AuthUserPayload) {
    return prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: user.id },
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}
