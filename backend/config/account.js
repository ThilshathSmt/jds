// Rules of account self-service: profile pictures, password recovery and e-mail changes.
// The server applies these; nothing sent by a browser can change them.

// How long a link sent by e-mail can be used, in minutes
export const PASSWORD_RESET_TTL_MINUTES = 30
export const EMAIL_CHANGE_TTL_MINUTES = 60

// A new password reset e-mail for the same account is sent at most this often (a repeated
// request inside the interval gets the same generic answer, but nothing is sent)
export const PASSWORD_RESET_RESEND_SECONDS = 60

// What account_tokens.purpose holds
export const TOKEN_PURPOSES = {
  passwordReset: 'PASSWORD_RESET',
  emailChange: 'EMAIL_CHANGE',
}

// Profile pictures: allowed extensions and the content type each one is served with
export const PROFILE_PICTURE_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_PICTURE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}
