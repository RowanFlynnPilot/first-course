import { describe, expect, it } from 'vitest'
import { NO_CONNECTION_MESSAGE, plainMessage } from './errors'

describe('error messages in the cook’s words', () => {
  it('says "no connection" for a request that never got an answer, in every browser’s words', () => {
    for (const message of [
      'TypeError: Failed to fetch',
      'TypeError: Load failed',
      'NetworkError when attempting to fetch resource.',
      'TimeoutError: signal timed out',
      'AbortError: The operation was aborted.',
      // A session that could not be renewed for want of signal, as the Data API client names it.
      'AuthRetryableFetchError: {}',
    ]) {
      expect(plainMessage({ message }), message).toBe(NO_CONNECTION_MESSAGE)
    }
  })

  it('rewords the sign-in and sign-up failures by their code', () => {
    expect(plainMessage({ message: 'Invalid login credentials', code: 'invalid_credentials' })).toBe('That email and password do not match an account.')
    expect(plainMessage({ message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' })).toBe('Too many emails for now. Wait an hour, then try again.')
    expect(plainMessage({ message: 'Email not confirmed', code: 'email_not_confirmed' })).toMatch(/^Confirm your email first/)
  })

  it('keeps any other message, which still says what failed', () => {
    expect(plainMessage({ message: 'new row violates check constraint', code: '23514' })).toBe('new row violates check constraint')
  })

  it('drops the "Error:" the Data API client puts before the app’s own words', () => {
    expect(plainMessage({ message: 'Error: You are signed out on this phone.', code: '' })).toBe('You are signed out on this phone.')
  })
})
