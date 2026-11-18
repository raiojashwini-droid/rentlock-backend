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

    return threads.map((th) => ({
      id: th.id,
      subject: th.subject,
      lastMessage: th.messages[0]?.content || '',
      lastMessageAt: th.lastMessageAt,
      unreadCount: th.messages.filter((m) => !m.isRead && m.senderId !== user.id).length,
    }));
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

  static async sendMessage(data: any, sender: AuthUserPayload) {
    let threadId = data.threadId;

    if (!threadId) {
      const newThread = await prisma.messageThread.create({
        data: {
          participant1Id: sender.id,
          participant2Id: data.recipientId,
          lastMessageAt: new Date(),
        },
      });
      threadId = newThread.id;
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
      include: { sender: { select: { id: true, name: true, role: true } } },
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
