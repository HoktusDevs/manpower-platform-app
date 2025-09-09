import React, { useState } from 'react';
import { getFieldTemplatesByCategory, createFieldFromTemplate, QUICK_START_FORMS, getFieldTemplateById } from '../../utils/fieldTemplates';
import type { CreateFormFieldInput } from '../../services/graphqlService';
import type { FieldTemplate } from '../../utils/fieldTemplates';

interface FieldTemplateSelectorProps {
  onAddFields: (fields: CreateFormFieldInput[]) => void;
  currentFieldsCount: number;
}

export const FieldTemplateSelector: React.FC<FieldTemplateSelectorProps> = ({
  onAddFields,
  currentFieldsCount
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'quickStart'>('individual');
  const [selectedCategory, setSelectedCategory] = useState<string>('personal');
  
  const categories = getFieldTemplatesByCategory();
  
  const handleAddTemplate = (template: FieldTemplate) => {
    const field = createFieldFromTemplate(template, currentFieldsCount + 1);
    onAddFields([field]);
  };
  
  const handleQuickStart = (quickStartId: string) => {
    const quickStart = QUICK_START_FORMS.find(q => q.id === quickStartId);
    if (!quickStart) return;
    
    const fields: CreateFormFieldInput[] = [];
    let order = currentFieldsCount + 1;
    
    for (const templateId of quickStart.fields) {
      const template = getFieldTemplateById(templateId);
      if (template) {
        fields.push(createFieldFromTemplate(template, order));
        order++;
      }
    }
    
    onAddFields(fields);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Agregar Campos Predefinidos
        </h3>
        <p className="text-sm text-gray-600">
          Ahorra tiempo usando campos pre-configurados o plantillas completas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'individual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Campos Individuales
        </button>
        <button
          onClick={() => setActiveTab('quickStart')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'quickStart'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Plantillas Rápidas
        </button>
      </div>

      {/* Individual Fields Tab */}
      {activeTab === 'individual' && (
        <>
          {/* Category Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Field Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {categories
              .find(c => c.id === selectedCategory)
              ?.templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => handleAddTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                      {template.name}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {template.field.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.field.required 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {template.field.required ? 'Obligatorio' : 'Opcional'}
                    </span>
                    
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Agregar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Quick Start Tab */}
      {activeTab === 'quickStart' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUICK_START_FORMS.map((quickStart) => (
            <div
              key={quickStart.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => handleQuickStart(quickStart.id)}
            >
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600">
                  {quickStart.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {quickStart.description}
                </p>
              </div>
              
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">
                  Incluye {quickStart.fields.length} campos:
                </p>
                <div className="flex flex-wrap gap-1">
                  {quickStart.fields.slice(0, 4).map((fieldId) => {
                    const template = getFieldTemplateById(fieldId);
                    return template ? (
                      <span key={fieldId} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {template.name}
                      </span>
                    ) : null;
                  })}
                  {quickStart.fields.length > 4 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      +{quickStart.fields.length - 4} más
                    </span>
                  )}
                </div>
              </div>
              
              <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity border-t border-gray-100 pt-2">
                Usar Plantilla Completa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};