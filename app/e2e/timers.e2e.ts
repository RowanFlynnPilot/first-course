import { expect, SALAD_DONE, test } from './kitchen'

// Counts oscillator starts, so a test can hear the chime. Each chime is three beeps.
const COUNT_BEEPS = () => {
  const counter = window as unknown as { beeps: number }
  counter.beeps = 0
  const start = OscillatorNode.prototype.start
  OscillatorNode.prototype.start = function (this: OscillatorNode, ...args: Parameters<OscillatorNode['start']>) {
    counter.beeps += 1
    return start.apply(this, args)
  }
}

test.describe('timers in cook mode', () => {
  test('a timer started on step 3 keeps counting on step 4, then chimes', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)

    await expect(page.getByText('Step 3 of 7')).toBeVisible()
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await expect(page.getByRole('timer')).toContainText(/1[45]:\d\d/)

    await page.getByRole('link', { name: 'Next step' }).click()
    await expect(page.getByText('Step 4 of 7')).toBeVisible()
    const chip = page.getByRole('link', { name: /^Step 3:/ })
    await expect(chip).toHaveText(/^Step 3: 1[45]:\d\d$/)

    await page.clock.fastForward('15:00')
    await expect(chip).toHaveText('Step 3: time is up')
    await expect(chip).toHaveClass(/timer-chip-done/)
    await expect.poll(() => page.evaluate(() => (window as unknown as { beeps: number }).beeps)).toBe(3)

    await chip.click()
    await expect(page.getByText('Step 3 of 7')).toBeVisible()
    await expect(page.getByRole('timer')).toContainText('Time is up')
    await page.getByRole('button', { name: 'Reset timer' }).click()
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeVisible()
  })

  test('leaving cook mode with a timer running asks first', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/6', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()

    const messages: string[] = []
    page.once('dialog', (dialog) => {
      messages.push(dialog.message())
      void dialog.dismiss()
    })
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    expect(messages).toEqual(['A timer is still running. Leaving cook mode stops it.'])
    await expect(page.getByText('Step 6 of 7')).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    await expect(page.getByRole('heading', { name: 'Sheet-pan sausage and vegetables' })).toBeVisible()
  })

  test('every step can show the ingredients without leaving cook mode', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/4', SALAD_DONE)
    await page.getByText('Ingredients and amounts').click()
    await expect(page.getByText('Smoked sausage (kielbasa), fully cooked')).toBeVisible()
    await expect(page.getByText('Step 4 of 7')).toBeVisible()
  })
})
