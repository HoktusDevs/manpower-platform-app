import { BaseUser, User } from './User';

export interface AdminData extends User {
  userType: 'admin';
}

export class Admin extends BaseUser {
  constructor(data: Partial<AdminData>) {
    super({ ...data, userType: 'admin' });
  }

  public toJSON(): AdminData {
    return {
      ...super.toJSON(),
      userType: 'admin'
    };
  }
}