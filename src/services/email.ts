import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ''),
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    path: string;
  }[];
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      ...options,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ E-mail enviado com sucesso:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    throw error;
  }
};
