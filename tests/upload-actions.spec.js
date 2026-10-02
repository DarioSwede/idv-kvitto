import {test,expect} from '@playwright/test';

async function openCompensationStep(page){
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
  await page.getByRole('button',{name:'Starta ansökan'}).click();
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
  await expect(page.locator('#travelCalculation')).toHaveText('Välj fordon för att beräkna milersättningen.');
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByLabel('Vilket fordon reste du med?').selectOption('private_car');
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

for(const [vehicle,amount] of [['private_car','25,00'],['company_car','12,00'],['company_electric','9,50'],['motorcycle','12,00']]){
  test(`fordonsval ${vehicle} styr belopp och kontrollsteg`,async({page})=>{
    await page.route('**/functions/v1/**',route=>route.fulfill({json:{settings:{travel_rate_per_km:2.5}}}));
    await openCompensationStep(page);
    await page.getByLabel(/^Milersättning/).check();
    await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
    await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('10');
    await expect(page.locator('#travelCalculation')).toBeDisabled();
    await expect(page.locator('#continue')).toBeDisabled();
    await page.getByLabel('Vilket fordon reste du med?').selectOption(vehicle);
    await expect(page.locator('#travelCalculation')).toContainText(`= ${amount} kr`);
    await page.locator('#travelCalculation').click();
    await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
    await expect(page.locator('#summary')).toContainText('Fordon och ersättning');
    await expect(page.locator('#summary')).toContainText(`${amount} kr`);
    const travel=await page.evaluate(()=>window.__idvTravel.getData());
    expect(travel.vehicleType).toBe(vehicle);
    expect(travel.vehicleLabel).toContain('kr/mil');
  });
}
test('byte av fordon nollställer godkännandet',async({page})=>{
  await openCompensationStep(page);
  await page.getByLabel(/^Milersättning/).check();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('10');
  await page.getByLabel('Vilket fordon reste du med?').selectOption('private_car');
  await page.locator('#travelCalculation').click();
  await expect(page.locator('#continue')).toBeEnabled();
  await page.getByLabel('Vilket fordon reste du med?').selectOption('company_electric');
  await expect(page.locator('#continue')).toBeDisabled();
  await expect(page.locator('#travelCalculation')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#travelCalculation')).toContainText('9,50 kr');
});
