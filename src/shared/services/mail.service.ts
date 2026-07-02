import { Resend } from 'resend';
import ejs from 'ejs';
import path from 'path';
import { env } from '../config/env';

/** 
---------------------------------------------------------------
  Service handling email delivery using Resend (HTTP API) and EJS templates.
---------------------------------------------------------------
**/
export class MailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
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
  async sendActivationEmail(
    user: { name: string; email: string },
    activationToken: string,
  ): Promise<void> {
    const activationLink = `${env.CLIENT_APP_URL}/activate?token=${activationToken}`;

    const html = await this.renderTemplate('client-activation-mail.ejs', {
      user,
      activationLink,
    });

    const { error } = await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Activate Your Account',
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  /** 
  ---------------------------------------------------------------
    Sends a password reset email with a clickable reset link.
  ---------------------------------------------------------------
  **/
  async sendPasswordResetEmail(
    user: { name: string; email: string },
    resetToken: string,
  ): Promise<void> {
    const resetLink = `${env.CLIENT_APP_URL}/reset-password?token=${resetToken}`;

    const html = await this.renderTemplate('client-reset-password-mail.ejs', {
      user,
      resetLink,
    });

    const { error } = await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject: 'Reset Your Password',
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  /** 
  ---------------------------------------------------------------
    Sends a warning email about subscription expiry
  ---------------------------------------------------------------
  **/
  async sendExpiryWarningEmail(
    user: { name: string; email: string },
    daysBefore: number,
    skuName: string,
  ): Promise<void> {
    const html = await this.renderTemplate('client-expiry-warning-mail.ejs', {
      user,
      daysBefore,
      skuName,
    });

    let subject = `Reminder: Your ${skuName} Subscription Expires in ${daysBefore} Day${daysBefore > 1 ? 's' : ''}`;
    if (daysBefore === 0) {
      subject = `Action Required: Your ${skuName} Subscription Expires Today`;
    } else if (daysBefore === -1) {
      subject = `Notice: Your ${skuName} Subscription is in Grace Period`;
    } else if (daysBefore === -7) {
      subject = `Alert: Your ${skuName} Subscription Grace Period Ended`;
    }

    const { error } = await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  /**
  ---------------------------------------------------------------
    Sends a purchase receipt / confirmation email. Handles all three
    purchase types (coin top-up, plan subscription, add-on) through a
    single template discriminated by `purchase.type`.
  ---------------------------------------------------------------
  **/
  async sendPurchaseSuccessEmail(
    user: { name: string; email: string },
    purchase: PurchaseSuccessDetails,
  ): Promise<void> {
    const html = await this.renderTemplate('purchase-success-mail.ejs', {
      user,
      purchase,
    });

    let subject = 'Your Purchase Was Successful';
    if (purchase.type === 'coin' && purchase.coinAmount !== undefined) {
      subject = `Payment Successful — ${purchase.coinAmount.toLocaleString('id-ID')} Coins Added`;
    } else if (purchase.type === 'plan' && purchase.planName) {
      subject = `Payment Successful — ${purchase.planName} Activated`;
    } else if (purchase.type === 'addon' && purchase.addonName) {
      subject = `Payment Successful — ${purchase.addonName} Added`;
    }

    const { error } = await this.resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: user.email,
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}

/**
 * Data accepted by {@link MailService.sendPurchaseSuccessEmail}. Shared fields
 * describe the order; type-specific fields populate the highlight panel.
 */
export interface PurchaseSuccessDetails {
  type: 'coin' | 'plan' | 'addon';
  orderId: string;
  totalPaid: number;
  /** Pre-formatted date string. Defaults to the send date if omitted. */
  purchaseDate?: string;
  paymentMethod?: string;
  /** Currency symbol prefix for amounts. Defaults to 'Rp'. */
  currencySymbol?: string;
  /** Breakdown rows rendered above the total (e.g. subtotal, tax, fee). */
  lineItems?: { label: string; amount: number }[];
  /** Optional call-to-action button. */
  ctaUrl?: string;
  ctaLabel?: string;
  // ── coin ──
  coinAmount?: number;
  newBalance?: number;
  // ── plan ──
  planName?: string;
  planPeriod?: string;
  validUntil?: string;
  // ── addon ──
  addonName?: string;
  addonQty?: number;
}
