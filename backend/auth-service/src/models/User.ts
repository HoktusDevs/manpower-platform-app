export interface User {
  id: string;
  email: string;
  password: string;
  userType: 'admin' | 'postulante';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export abstract class BaseUser {
  public id: string;
  public email: string;
  public password: string;
  public userType: 'admin' | 'postulante';
  public isActive: boolean;
  public createdAt: string;
  public updatedAt: string;

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.userType = data.userType || 'postulante';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  public toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      password: this.password,
      userType: this.userType,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }
}