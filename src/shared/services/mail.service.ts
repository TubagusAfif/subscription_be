import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { env } from '../config/env';

/** 
---------------------------------------------------------------
  Service handling email delivery using Nodemailer and EJS templates.
---------------------------------------------------------------
**/
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      service: env.SMTP_SERVICE,
      auth: {
        user: env.SMTP_MAIL,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  /** 
  ---------------------------------------------------------------
    Renders an EJS template from the mails directory and returns HTML string.
  ---------------------------------------------------------------
  **/
  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    const templatePath = path.join(__dirname, '..', 'mails', templateName);
    return ejs.renderFile(templatePath, data);
  }

  /** 
  ---------------------------------------------------------------
    Sends an account activation email with a clickable activation link.
  ---------------------------------------------------------------
  **/
  async sendActivationEmail(user: { name: string; email: string }, activationToken: string): Promise<void> {
    const activationLink = `${env.CLIENT_APP_URL}/activate?token=${activationToken}`;

    const html = await this.renderTemplate('client-activation-mail.ejs', {
      user,
      activationLink,
    });

    await this.transporter.sendMail({
      from: env.SMTP_MAIL,
      to: user.email,
      subject: 'Activate Your Account',
      html,
    });
  }

  /** 
  ---------------------------------------------------------------
    Sends a password reset email with a clickable reset link.
  ---------------------------------------------------------------
  **/
  async sendPasswordResetEmail(user: { name: string; email: string }, resetToken: string): Promise<void> {
    const resetLink = `${env.CLIENT_APP_URL}/reset-password?token=${resetToken}`;

    const html = await this.renderTemplate('client-reset-password-mail.ejs', {
      user,
      resetLink,
    });

    await this.transporter.sendMail({
      from: env.SMTP_MAIL,
      to: user.email,
      subject: 'Reset Your Password',
      html,
    });
  }
}
