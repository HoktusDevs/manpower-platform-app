// Script para generar todos los resolvers faltantes automáticamente

const MISSING_RESOLVERS = [
  // Forms
  { field: 'getActiveForms', table: 'forms', operation: 'Scan' },
  { field: 'getForm', table: 'forms', operation: 'GetItem' },
  { field: 'getFormSubmissions', table: 'formSubmissions', operation: 'Query' },
  { field: 'getMyFormSubmissions', table: 'formSubmissions', operation: 'Query' },
  
  // Job Postings
  { field: 'getActiveJobPostings', table: 'jobPostings', operation: 'Scan' },
  { field: 'getJobPosting', table: 'jobPostings', operation: 'GetItem' },
  { field: 'getAllJobPostings', table: 'jobPostings', operation: 'Scan' },
];

export function generateResolverCode(): string {
  return MISSING_RESOLVERS.map(resolver => `
    // ${resolver.field}
    ${resolver.table}DataSource.createResolver('${resolver.field}Resolver', {
      typeName: 'Query',
      fieldName: '${resolver.field}',
      requestMappingTemplate: appsync.MappingTemplate.fromString(\`
        {
          "version" : "2017-02-28",
          "operation" : "${resolver.operation}"
        }
      \`),
      responseMappingTemplate: appsync.MappingTemplate.fromString(\`
        $util.toJson($ctx.result.items)
      \`),
    });
  `).join('\n');
}