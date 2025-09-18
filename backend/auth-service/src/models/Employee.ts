import { BaseUser, User } from './User';

export interface EmployeeData extends User {
  userType: 'postulante';
  fullName: string;
  phone: string;
  rut: string;
  dateOfBirth: string;
  address: string;
  city: string;
  educationLevel: string;
  workExperience?: string;
  skills?: string;
}

export class Employee extends BaseUser {
  public fullName: string;
  public phone: string;
  public rut: string;
  public dateOfBirth: string;
  public address: string;
  public city: string;
  public educationLevel: string;
  public workExperience?: string;
  public skills?: string;

  constructor(data: Partial<EmployeeData>) {
    super({ ...data, userType: 'postulante' });
    this.fullName = data.fullName || '';
    this.phone = data.phone || '';
    this.rut = data.rut || '';
    this.dateOfBirth = data.dateOfBirth || '';
    this.address = data.address || '';
    this.city = data.city || '';
    this.educationLevel = data.educationLevel || '';
    this.workExperience = data.workExperience;
    this.skills = data.skills;
  }

  public toJSON(): EmployeeData {
    return {
      ...super.toJSON(),
      userType: 'postulante',
      fullName: this.fullName,
      phone: this.phone,
      rut: this.rut,
      dateOfBirth: this.dateOfBirth,
      address: this.address,
      city: this.city,
      educationLevel: this.educationLevel,
      workExperience: this.workExperience,
      skills: this.skills
    };
  }
}