import { hash } from 'bcrypt';
import { PrismaClient, User } from '@prisma/client';
import { CreateUserDto, ManageGroupsDto } from '@dtos/users.dto';
import { HttpException } from '@exceptions/HttpException';
import { isEmpty } from '@utils/util';

class UserService {
  public users = new PrismaClient().user;

  public async findAllUser(): Promise<Omit<User, 'password'>[]> {
    const allUser: Omit<User, 'password'>[] = await this.users.findMany({ select: { email: true, id: true } });
    return allUser;
  }

  public async findUserById(userId: number): Promise<Omit<User, 'password'>> {
    if (isEmpty(userId)) throw new HttpException(400, 'UserId is empty');

    const findUser = await this.users.findUnique({ where: { id: userId }, select: { email: true, id: true } });
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    return findUser;
  }

  public async createUser(userData: CreateUserDto): Promise<Omit<User, 'password'>> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const findUser = await this.users.findUnique({ where: { email: userData.email } });
    if (findUser) throw new HttpException(409, `This email ${userData.email} already exists`);

    const hashedPassword = await hash(userData.password, 10);
    const createUserData: Omit<User, 'password'> = await this.users.create({
      data: { ...userData, password: hashedPassword },
      select: { email: true, id: true },
    });
    return createUserData;
  }

  public async updateUser(userId: number, userData: CreateUserDto): Promise<Omit<User, 'password'>> {
    if (isEmpty(userData)) throw new HttpException(400, 'userData is empty');

    const findUser = await this.users.findUnique({ where: { id: userId } });
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    const hashedPassword = await hash(userData.password, 10);
    const updateUserData = await this.users.update({
      where: { id: userId },
      data: { ...userData, password: hashedPassword },
      select: { email: true, id: true },
    });
    return updateUserData;
  }

  public async deleteUser(userId: number): Promise<Omit<User, 'password'>> {
    if (isEmpty(userId)) throw new HttpException(400, "User doesn't existId");

    const findUser: User = await this.users.findUnique({ where: { id: userId } });
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    const deleteUserData = await this.users.delete({ where: { id: userId }, select: { email: true, id: true } });
    return deleteUserData;
  }

  public async manageGroups(userId: number, groupsData: ManageGroupsDto) {
    if (isEmpty(userId)) throw new HttpException(400, 'UserId is empty');
    if (isEmpty(groupsData)) throw new HttpException(400, "Groups don't exist");

    const findUser = await this.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!findUser) throw new HttpException(409, "User doesn't exist");

    const connectIds = groupsData.connect ?? [];
    const disconnectIds = groupsData.disconnect ?? [];

    if (connectIds.length === 0 && disconnectIds.length === 0) {
      throw new HttpException(400, 'Groups data is empty');
    }

    // Build the update operations
    const updateData: any = { groups: {} };

    if (connectIds.length > 0) {
      updateData.groups.connectOrCreate = connectIds.map(id => ({
        where: {
          user_id_group_id: {
            user_id: userId,
            group_id: id,
          },
        },
        create: {
          group: { connect: { id } },
        },
      }));
    }

    if (disconnectIds.length > 0) {
      updateData.groups.deleteMany = disconnectIds.map(id => ({
        user_id: userId,
        group_id: id,
      }));
    }

    const groups = await this.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        groups: {
          select: {
            group_id: true,
          },
        },
      },
    });

    return groups;
  }
}

export default UserService;
