import { useEffect } from 'react';

export const RedirectToLogin = () => {
  useEffect(() => {
    // Detect if we're in local development
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isLocalApplicantFrontend = window.location.port === '6200';
    
    // Use local auth-frontend URL when running locally
    const authFrontendUrl = (isLocalDevelopment && isLocalApplicantFrontend)
      ? 'http://localhost:6100'
      : 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com';
    
    // Redirect to auth-frontend login page
    window.location.href = `${authFrontendUrl}/login?redirect=applicant`;
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div>🔄 Redirigiendo al login...</div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Por favor espere...
        </div>
      </div>
    </div>
  );
};