/** Session is established only after email OTP verify — block dashboard until then. */
const OTP_PENDING_KEY = 'atherium_otp_pending'

export function setOtpPending(pending) {
  try {
    if (pending) sessionStorage.setItem(OTP_PENDING_KEY, '1')
    else sessionStorage.removeItem(OTP_PENDING_KEY)
  } catch {
    // ignore storage errors (private mode, etc.)
  }
}

export function isOtpPending() {
  try {
    return sessionStorage.getItem(OTP_PENDING_KEY) === '1'
  } catch {
    return false
  }
}
