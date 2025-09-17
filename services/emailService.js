import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendManagerCredentials = async (email, password) => {
  const mailOptions = {
    from: `ScanFlow <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Vos identifiants Manager ScanFlow',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Bienvenue sur ScanFlow !</h2>
        <p>Votre compte manager a été créé avec succès.</p>
        
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mot de passe temporaire:</strong> ${password}</p>
        </div>
        
        <p>Accédez à votre tableau de bord :</p>
        <a href="${process.env.FRONTEND_URL}/manager" 
           style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 4px;">
          Tableau de bord Manager
        </a>
        
        <p style="margin-top: 20px; color: #6b7280;">
          <small>Veuillez changer votre mot de passe après votre première connexion.</small>
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};