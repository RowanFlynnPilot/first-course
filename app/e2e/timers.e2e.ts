import { cookNotice, COUNT_BEEPS, expect, SALAD_DONE, test } from './kitchen'

// Counts oscillator starts, so a test can hear the chime. Each chime is three beeps.

test.describe('timers in cook mode', () => {
  test('a timer started on step 3 keeps counting on step 4, then chimes', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)

    await expect(page.getByText('Step 3 of 8')).toBeVisible()
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await expect(page.getByRole('timer')).toContainText(/1[45]:\d\d/)

    await page.getByRole('link', { name: 'Next step' }).click()
    await expect(page.getByText('Step 4 of 8')).toBeVisible()
    const chip = page.getByRole('link', { name: /^Potatoes:/ })
    await expect(chip).toHaveText(/^Potatoes: 1[45]:\d\d$/)

    await page.clock.fastForward('15:00')
    await expect(chip).toHaveText('Potatoes: time is up')
    await expect(chip).toHaveClass(/timer-chip-done/)
    await expect.poll(() => page.evaluate(() => (window as unknown as { beeps: number }).beeps)).toBe(3)

    await chip.click()
    await expect(page.getByText('Step 3 of 8')).toBeVisible()
    await expect(page.getByRole('timer')).toContainText('Time is up')
    await page.getByRole('button', { name: 'Clear timer' }).click()
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeVisible()
  })

  test('a finished timer rings every 5 seconds until a tap, and gives up after 2 minutes', async ({ page, kitchen }) => {
    const beeps = () => page.evaluate(() => (window as unknown as { beeps: number }).beeps)
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    // Time moves only when the test moves it.
    await page.clock.pauseAt(new Date('2026-10-03T18:00:30-05:00'))

    await page.clock.fastForward('15:00')
    await expect.poll(beeps).toBe(3)
    await page.clock.fastForward('00:05')
    await expect.poll(beeps).toBe(6)
    await page.getByText('Step 3 of 8').click()
    await page.clock.fastForward('00:10')
    await expect(page.getByRole('timer')).toContainText('Time is up')
    expect(await beeps()).toBe(6)

    // A second timer, left alone, rings out.
    await page.getByRole('button', { name: 'Clear timer' }).click()
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await page.clock.fastForward('15:00')
    await expect.poll(beeps).toBe(9)
    await page.clock.runFor('02:30')
    const rung = await beeps()
    expect(rung).toBeGreaterThan(9)
    await page.clock.runFor('00:30')
    expect(await beeps()).toBe(rung)
  })

  test('stopping a timer with more than a minute left asks first', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    const asked: string[] = []
    page.once('dialog', (dialog) => {
      asked.push(dialog.message())
      void dialog.dismiss()
    })
    await page.getByRole('button', { name: 'Stop timer' }).click()
    expect(asked).toEqual([expect.stringMatching(/^Stop the timer\? It still has 1[45]:\d\d to go\.$/)])
    await expect(page.getByRole('timer')).toContainText(/1[45]:\d\d/)
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Stop timer' }).click()
    await expect(page.getByRole('button', { name: 'Start 15:00 timer' })).toBeVisible()
  })

  test('leaving cook mode with a timer running asks first', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/7', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()

    const messages: string[] = []
    page.once('dialog', (dialog) => {
      messages.push(dialog.message())
      void dialog.dismiss()
    })
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    expect(messages).toEqual(['A timer is still running. Leave cook mode and stop it?'])
    await expect(page.getByText('Step 7 of 8')).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    await expect(page.getByRole('heading', { name: 'Sheet-pan sausage and vegetables' })).toBeVisible()
  })

  test('a running timer survives a reload, and chimes once a tap turns the sound back on', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await page.clock.fastForward('05:00')
    await expect(page.getByRole('timer')).toContainText(/^(10:00|9:[45]\d)Stop timer$/)

    await page.reload()
    await expect(page.getByText('Step 3 of 8')).toBeVisible()
    await expect(page.getByRole('timer')).toContainText(/^(10:00|9:[45]\d)Stop timer$/)
    await expect(page.getByText('The page reloaded. Tap anywhere so your timers can ring.')).toBeVisible()

    await page.getByText('Step 3 of 8').click()
    await expect(page.getByText('The page reloaded.')).toHaveCount(0)
    await page.clock.fastForward('10:00')
    await expect(page.getByRole('timer')).toContainText('Time is up')
    await expect.poll(() => page.evaluate(() => (window as unknown as { beeps: number }).beeps)).toBe(3)
  })

  test('a timer that ran out with no tap since the reload chimes at the first tap', async ({ page, kitchen }) => {
    await page.clock.install({ time: new Date('2026-10-03T18:00:00-05:00') })
    await page.addInitScript(COUNT_BEEPS)
    await kitchen.open('#/cook/sheet-pan-sausage/3', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 15:00 timer' }).click()
    await page.reload()
    // Loaded first: a jump of the clock while the opening reads are out would trip their time limit.
    await expect(page.getByText('Step 3 of 8')).toBeVisible()
    await page.clock.fastForward('16:00')
    await expect(page.getByRole('timer')).toContainText('Time is up')
    await expect.poll(() => page.evaluate(() => (window as unknown as { beeps: number }).beeps)).toBe(0)
    await page.getByText('Step 3 of 8').click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { beeps: number }).beeps)).toBe(3)
  })

  test('a timer that finished long ago is dropped', async ({ page, kitchen }) => {
    await page.addInitScript(() => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      sessionStorage.setItem('first-course:timers-by-label:sheet-pan-sausage', JSON.stringify({ Potatoes: { endsAt: twoHoursAgo, rang: true } }))
    })
    await kitchen.open('#/cook/sheet-pan-sausage/4', SALAD_DONE)
    await expect(page.getByText('Step 4 of 8')).toBeVisible()
    await expect(page.getByRole('link', { name: /^Potatoes:/ })).toHaveCount(0)
  })

  test('leaving cook mode and logging the cook both stop its timers', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/7', SALAD_DONE)
    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('link', { name: 'Leave cook mode' }).click()
    // Let the navigation to the recipe page land before going back to cook mode.
    await expect(page.getByRole('heading', { name: 'Sheet-pan sausage and vegetables' })).toBeVisible()
    await page.goto('#/cook/sheet-pan-sausage/7')
    await expect(page.getByRole('button', { name: 'Start 20:00 timer' })).toBeVisible()

    await page.getByRole('button', { name: 'Start 20:00 timer' }).click()
    await page.getByRole('link', { name: 'Next step' }).click()
    // The sheet pan's last step has no timer, but the roasting one is still running: logging asks first.
    const asked: string[] = []
    page.once('dialog', (dialog) => {
      asked.push(dialog.message())
      void dialog.accept()
    })
    await page.getByRole('link', { name: 'Finish and log it' }).click()
    expect(asked).toEqual(['A timer is still running. Stop it and log the cook?'])
    await page.getByRole('radio', { name: /^Decent/ }).check()
    await page.getByRole('button', { name: 'Save this cook' }).click()
    await expect(cookNotice(page)).toBeVisible()
    expect(await page.evaluate(() => sessionStorage.getItem('first-course:timers-by-label:sheet-pan-sausage'))).toBeNull()
  })

  test('every step can show the ingredients without leaving cook mode', async ({ page, kitchen }) => {
    await kitchen.open('#/cook/sheet-pan-sausage/4', SALAD_DONE)
    await page.getByText('Ingredients and amounts').click()
    await expect(page.getByText('Fully cooked smoked sausage (kielbasa)')).toBeVisible()
    await expect(page.getByText('Step 4 of 8')).toBeVisible()
  })
})
