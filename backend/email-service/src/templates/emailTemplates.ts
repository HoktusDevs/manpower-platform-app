export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export type TemplateData = Record<string, string | number | boolean>;

export class EmailTemplates {
  static getTemplate(templateId: string, data: TemplateData): EmailTemplate | null {
    switch (templateId) {
      case 'interview-confirmation':
        return this.interviewConfirmation(data);
      case 'interview-reminder':
        return this.interviewReminder(data);
      case 'application-received':
        return this.applicationReceived(data);
      case 'application-status-update':
        return this.applicationStatusUpdate(data);
      case 'welcome':
        return this.welcome(data);
      case 'password-reset':
        return this.passwordReset(data);
      default:
        return null;
    }
  }

  private static interviewConfirmation(data: TemplateData): EmailTemplate {
    const { candidateName, interviewDate, interviewTime, location, interviewerName } = data;

    return {
      subject: 'Confirmación de Entrevista - Manpower',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmación de Entrevista</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${candidateName}</strong>,</p>
              <p>Te confirmamos que tu entrevista está programada para:</p>
              <div class="details">
                <p><strong>Fecha:</strong> ${interviewDate}</p>
                <p><strong>Hora:</strong> ${interviewTime}</p>
                <p><strong>Lugar:</strong> ${location}</p>
                <p><strong>Entrevistador:</strong> ${interviewerName}</p>
              </div>
              <p>Por favor, llega 10 minutos antes y trae tu currículum actualizado y un documento de identidad.</p>
              <p>Si tienes alguna pregunta o necesitas reprogramar, no dudes en contactarnos.</p>
              <p>¡Mucha suerte!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Confirmación de Entrevista - Manpower

Hola ${candidateName},

Te confirmamos que tu entrevista está programada para:

Fecha: ${interviewDate}
Hora: ${interviewTime}
Lugar: ${location}
Entrevistador: ${interviewerName}

Por favor, llega 10 minutos antes y trae tu currículum actualizado y un documento de identidad.

Si tienes alguna pregunta o necesitas reprogramar, no dudes en contactarnos.

¡Mucha suerte!

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }

  private static interviewReminder(data: TemplateData): EmailTemplate {
    const { candidateName, interviewDate, interviewTime, location } = data;

    return {
      subject: 'Recordatorio: Tu entrevista es mañana - Manpower',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9900; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9900; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Recordatorio de Entrevista</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${candidateName}</strong>,</p>
              <p>Este es un recordatorio de que tu entrevista está programada para <strong>mañana</strong>:</p>
              <div class="details">
                <p><strong>Fecha:</strong> ${interviewDate}</p>
                <p><strong>Hora:</strong> ${interviewTime}</p>
                <p><strong>Lugar:</strong> ${location}</p>
              </div>
              <p>Recuerda:</p>
              <ul>
                <li>Llegar 10 minutos antes</li>
                <li>Traer tu currículum actualizado</li>
                <li>Traer un documento de identidad</li>
              </ul>
              <p>¡Nos vemos mañana!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Recordatorio de Entrevista - Manpower

Hola ${candidateName},

Este es un recordatorio de que tu entrevista está programada para mañana:

Fecha: ${interviewDate}
Hora: ${interviewTime}
Lugar: ${location}

Recuerda:
- Llegar 10 minutos antes
- Traer tu currículum actualizado
- Traer un documento de identidad

¡Nos vemos mañana!

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }

  private static applicationReceived(data: TemplateData): EmailTemplate {
    const { candidateName, positionTitle } = data;

    return {
      subject: 'Hemos recibido tu postulación - Manpower',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #00aa00; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Postulación Recibida</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${candidateName}</strong>,</p>
              <p>Hemos recibido tu postulación para el cargo de <strong>${positionTitle}</strong>.</p>
              <p>Nuestro equipo de recursos humanos revisará tu perfil y nos pondremos en contacto contigo próximamente si tu perfil se ajusta a los requisitos del puesto.</p>
              <p>Te agradecemos tu interés en formar parte de nuestro equipo.</p>
              <p>Saludos cordiales,<br>Equipo de Recursos Humanos<br>Manpower</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Postulación Recibida - Manpower

Hola ${candidateName},

Hemos recibido tu postulación para el cargo de ${positionTitle}.

Nuestro equipo de recursos humanos revisará tu perfil y nos pondremos en contacto contigo próximamente si tu perfil se ajusta a los requisitos del puesto.

Te agradecemos tu interés en formar parte de nuestro equipo.

Saludos cordiales,
Equipo de Recursos Humanos
Manpower

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }

  private static applicationStatusUpdate(data: TemplateData): EmailTemplate {
    const { candidateName, positionTitle, status, statusMessage } = data;

    return {
      subject: `Actualización de tu postulación - ${positionTitle}`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Actualización de Postulación</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${candidateName}</strong>,</p>
              <p>Tenemos una actualización sobre tu postulación para el cargo de <strong>${positionTitle}</strong>.</p>
              <p><strong>Estado:</strong> ${status}</p>
              <p>${statusMessage}</p>
              <p>Saludos cordiales,<br>Equipo de Recursos Humanos<br>Manpower</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Actualización de Postulación - Manpower

Hola ${candidateName},

Tenemos una actualización sobre tu postulación para el cargo de ${positionTitle}.

Estado: ${status}

${statusMessage}

Saludos cordiales,
Equipo de Recursos Humanos
Manpower

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }

  private static welcome(data: TemplateData): EmailTemplate {
    const { userName, userEmail } = data;

    return {
      subject: '¡Bienvenido a Manpower Platform!',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Bienvenido a Manpower!</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${userName}</strong>,</p>
              <p>Tu cuenta ha sido creada exitosamente en Manpower Platform.</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p>Ahora puedes acceder a todas las funcionalidades de nuestra plataforma.</p>
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
              <p>¡Bienvenido a bordo!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
¡Bienvenido a Manpower Platform!

Hola ${userName},

Tu cuenta ha sido creada exitosamente en Manpower Platform.

Email: ${userEmail}

Ahora puedes acceder a todas las funcionalidades de nuestra plataforma.

Si tienes alguna pregunta, no dudes en contactarnos.

¡Bienvenido a bordo!

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }

  private static passwordReset(data: TemplateData): EmailTemplate {
    const { userName, resetLink, expirationTime } = data;

    return {
      subject: 'Recuperación de Contraseña - Manpower',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #cc0000; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #cc0000; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${userName}</strong>,</p>
              <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
              <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              </p>
              <p>Este enlace expirará en <strong>${expirationTime}</strong>.</p>
              <p>Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.</p>
              <p>Por razones de seguridad, nunca compartas este correo con nadie.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Recuperación de Contraseña - Manpower

Hola ${userName},

Hemos recibido una solicitud para restablecer tu contraseña.

Haz clic en el siguiente enlace para crear una nueva contraseña:

${resetLink}

Este enlace expirará en ${expirationTime}.

Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá sin cambios.

Por razones de seguridad, nunca compartas este correo con nadie.

© ${new Date().getFullYear()} Manpower Platform. Todos los derechos reservados.
      `,
    };
  }
}