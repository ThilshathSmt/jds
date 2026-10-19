// Sends the account e-mails (password reset, e-mail change verification, the approval of a
// registration application) through EmailJS's REST API, from the server: the private key stays in the server's environment and the
// browser never takes part. A successful send only means EmailJS accepted the e-mail; what
// the link allows is decided by the server when it is opened (see accountService.js).
//
// Every e-mail uses the same template parameters, so one EmailJS template can serve both:
//   to_email, to_name, subject, message, action_label, action_url, expiry_minutes, app_name
// plus reset_url and driving_school_id (password reset: the ID is what the account logs in
// with) or verification_url (e-mail change), for templates that prefer a specific name.
// The approval e-mail has its own template (EMAILJS_APPROVAL_TEMPLATE_ID), with to_email,
// to_name, subject, driving_school_id, registration_url, app_name and message.
// Never a password.

import env from '../config/env.js'
import AppError from '../utils/AppError.js'

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'
const APP_NAME = 'Jeslan Driving School'
const SEND_TIMEOUT_MS = 10000

// The account settings, and the template of one kind of e-mail (the reset one by default)
export const isEmailConfigured = (templateId = env.emailjs.resetTemplateId) => {
  const { serviceId, publicKey, privateKey } = env.emailjs
  return Boolean(serviceId && publicKey && privateKey && templateId)
}

// The default transport: one POST to EmailJS. Throws when EmailJS refuses the e-mail.
// Its error text never contains the template parameters (which hold the link).
const sendWithEmailJs = async ({ templateId, templateParams }) => {
  const { serviceId, publicKey, privateKey } = env.emailjs
  const response = await fetch(EMAILJS_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: templateParams,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  })
  if (!response.ok) {
    const reason = (await response.text().catch(() => '')).slice(0, 200)
    throw new Error(`EmailJS refused the e-mail (HTTP ${response.status}): ${reason}`)
  }
}

let transport = sendWithEmailJs

// Tests replace the transport to read the e-mails instead of sending them. null restores it.
export const setEmailTransport = (replacement) => {
  transport = replacement ?? sendWithEmailJs
}

const send = async (templateId, templateParams) => {
  // Tests run without EmailJS settings; a real send needs them
  if (transport === sendWithEmailJs && !isEmailConfigured(templateId)) {
    throw new AppError(503, 'E-mail sending is not set up on the server. Please contact the school.')
  }
  await transport({ templateId, templateParams: { app_name: APP_NAME, ...templateParams } })
}

// A link to a page of the frontend, at the address configured for this environment
export const frontendUrl = (pathname, params) => {
  const url = new URL(pathname, env.clientUrl)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  return url.toString()
}

export const sendPasswordResetEmail = ({ email, name, drivingSchoolId }, { resetUrl, expiryMinutes }) =>
  send(env.emailjs.resetTemplateId, {
    to_email: email,
    to_name: name,
    driving_school_id: drivingSchoolId,
    subject: `Reset your ${APP_NAME} password`,
    message: `We received a request to reset the password of your ${APP_NAME} account. Use the link below to choose a new password. It works once and expires in ${expiryMinutes} minutes. If you did not ask for this, you can ignore this e-mail: your password stays the same.`,
    action_label: 'Reset Password',
    action_url: resetUrl,
    reset_url: resetUrl,
    expiry_minutes: String(expiryMinutes),
  })

export const sendEmailChangeVerification = ({ email, name }, { verificationUrl, expiryMinutes }) =>
  send(env.emailjs.verifyEmailTemplateId, {
    to_email: email,
    to_name: name,
    subject: `Confirm your new ${APP_NAME} e-mail address`,
    message: `This address was entered as the new e-mail address of your ${APP_NAME} account. Use the link below to confirm it. It works once and expires in ${expiryMinutes} minutes. Until it is confirmed, your account keeps its previous e-mail address. If you did not ask for this, ignore this e-mail.`,
    action_label: 'Confirm E-mail Address',
    action_url: verificationUrl,
    verification_url: verificationUrl,
    expiry_minutes: String(expiryMinutes),
  })

// A first-time application was approved: the Driving School ID the student registers and
// logs in with, and where to register. No password: the student chooses one when registering.
export const sendStudentApprovalEmail = ({ email, name }, { drivingSchoolId, registrationUrl }) =>
  send(env.emailjs.approvalTemplateId, {
    to_email: email,
    to_name: name,
    subject: `Your ${APP_NAME} application has been approved`,
    driving_school_id: drivingSchoolId,
    registration_url: registrationUrl,
    message: `Congratulations! Your registration application has been approved and your Driving School ID is ${drivingSchoolId}. To create your student account, open ${registrationUrl}, enter this Driving School ID, check that the name and e-mail shown are yours, and choose a password. After that, you log in with your Driving School ID and that password. Keep your Driving School ID safe: you need it every time you log in.`,
  })
