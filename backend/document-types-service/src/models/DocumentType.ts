export interface DocumentType {
  typeId: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  usageCount: number;  // Cuántas veces se ha usado
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastUsedAt?: string;  // Última vez que se usó
}

export class DocumentTypeModel {
  public typeId: string;
  public name: string;
  public description?: string;
  public category?: string;
  public isActive: boolean;
  public usageCount: number;
  public createdAt: string;
  public updatedAt: string;
  public createdBy: string;
  public lastUsedAt?: string;

  constructor(data: Partial<DocumentType>) {
    this.typeId = data.typeId || '';
    this.name = data.name || '';
    this.description = data.description;
    this.category = data.category;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.usageCount = data.usageCount || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.createdBy = data.createdBy || '';
    this.lastUsedAt = data.lastUsedAt;
  }

  // Validate document type data
  public isValid(): boolean {
    return !!(
      this.typeId &&
      this.name &&
      this.createdBy
    );
  }

  // Increment usage count
  public incrementUsage(): void {
    this.usageCount += 1;
    this.lastUsedAt = new Date().toISOString();
    this.updateTimestamp();
  }

  // Update timestamp
  public updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }

  // Convert to JSON
  public toJSON(): DocumentType {
    return {
      typeId: this.typeId,
      name: this.name,
      description: this.description,
      category: this.category,
      isActive: this.isActive,
      usageCount: this.usageCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      lastUsedAt: this.lastUsedAt
    };
  }

  // Generate category from name (auto-categorization)
  public static generateCategory(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('cv') || lowerName.includes('curriculum') || lowerName.includes('resume')) {
      return 'Personal';
    }
    if (lowerName.includes('certificado') || lowerName.includes('diploma') || lowerName.includes('titulo')) {
      return 'Educación';
    }
    if (lowerName.includes('cedula') || lowerName.includes('identidad') || lowerName.includes('pasaporte')) {
      return 'Identificación';
    }
    if (lowerName.includes('referencia') || lowerName.includes('carta')) {
      return 'Referencias';
    }
    if (lowerName.includes('experiencia') || lowerName.includes('laboral')) {
      return 'Experiencia';
    }
    if (lowerName.includes('salud') || lowerName.includes('medico')) {
      return 'Salud';
    }
    
    return 'Otros';
  }
}
