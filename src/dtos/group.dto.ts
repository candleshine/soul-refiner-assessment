import { IsInt, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  public name: string;
}

export class GroupMembershipDto {
  @IsInt()
  public userId: number;
}
