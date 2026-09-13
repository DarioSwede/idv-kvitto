import {test,expect} from '@playwright/test';

async function openCompensationStep(page){
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
  await page.getByLabel('Ditt namn').fill('Testperson');
  await page.getByLabel('Din e-postadress').fill('test@example.se');
  await page.getByLabel('Clearingnummer').fill('5000');
  await page.getByLabel('Kontonummer').fill('1234567');
  await page.getByRole('button',{name:'Nästa: välj ersättning'}).click();
}

test('milersättningen kräver ett tydligt aktivt godkännande',async({page})=>{
  await openCompensationStep(page);
  await expect(page.locator('#continue')).toBeDisabled();
  await page.getByLabel(/^Milersättning/).check();
  await expect(page.locator('#travelFields')).toBeVisible();
  await expect(page.getByRole('spinbutton',{name:'Antal kilometer'})).toHaveAttribute('placeholder','Ange antal kilometer');
  await expect(page.locator('#travelCalculation')).toHaveText('Milersättning: 25 kr per mil.');
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('10');
  await expect(page.locator('.travel-km-input')).toContainText('kilometer');
  await expect(page.locator('#travelCalculation')).toContainText('Klicka här för att godkänna:');
  await expect(page.locator('#travelCalculation')).toHaveClass(/needs-approval/);
  await expect(page.locator('#continue')).toBeDisabled();
  await page.locator('#travelCalculation').click();
  await expect(page.locator('#travelCalculation')).toContainText('Godkänd:');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await expect(page.locator('#travelCalculation')).not.toHaveClass(/needs-approval/);
  await expect(page.locator('#continue')).toBeEnabled();
});

test('ingen ersättningstyp kan skickas vidare utan innehåll',async({page})=>{
  await openCompensationStep(page);
  await expect(page.locator('#continue')).toBeDisabled();
  await page.getByLabel(/Kvitton för utlägg/).check();
  await expect(page.locator('#continue')).toBeDisabled();
  await page.getByLabel(/Kvitton för utlägg/).uncheck();
  await expect(page.locator('#continue')).toBeDisabled();
});
