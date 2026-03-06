import { PrismaClient } from '@prisma/client';

export class PgUserStore {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createUser(data: { email: string; name: string; password: string }) {
    return this.prisma.user.create({ data });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, isAdmin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, data: { name?: string; isAdmin?: boolean }) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
    await this.prisma.user.update({ where: { id }, data: updateData });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }
}
