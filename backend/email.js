const nodemailer = require('nodemailer');

// La cuenta y contraseña de aplicación se leen del .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function sendPasswordResetEmail(toEmail, resetLink) {
    const mailOptions = {
        from: `"Pesca Comunidad" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Recuperar tu contraseña - Pesca Comunidad',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #0d6efd;">🎣 Pesca Comunidad</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                <p>Si fuiste vos, hacé click en el siguiente botón (válido por 1 hora):</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #0d6efd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Restablecer contraseña
                    </a>
                </p>
                <p style="color: #666; font-size: 0.9em;">Si no pediste esto, podés ignorar este email tranquilamente — tu contraseña no va a cambiar.</p>
                <p style="color: #999; font-size: 0.8em;">Si el botón no funciona, copiá este link en tu navegador:<br>${resetLink}</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };
