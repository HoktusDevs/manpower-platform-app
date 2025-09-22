import { useEffect } from 'react';

export const RedirectToLogin = () => {
  useEffect(() => {
    // Redirect to auth-frontend login page
    window.location.href = 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com/login?redirect=applicant';
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