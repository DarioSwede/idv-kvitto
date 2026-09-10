import {test,expect} from '@playwright/test';

async function waitForAppState(page){
  if(await page.locator('input[name="submissionMode"]:checked').count()===0){
    await page.getByLabel(/Endast kvitton/).check();
  }
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
}

async function expectFullWidth(page){
  const actions=page.locator('#upload .receipt-actions');
  const button=page.locator('#upload #continue');
  const actionsBox=await actions.boundingBox();
  const buttonBox=await button.boundingBox();
  expect(actionsBox&&buttonBox).toBeTruthy();
  expect(Math.abs(buttonBox.x-actionsBox.x)).toBeLessThan(2);
  expect(Math.abs(buttonBox.width-actionsBox.width)).toBeLessThan(2);
}

test('nästa-knappen ligger fullbredd i alla inskickslägen och avbryt är dold',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await expect(page.locator('#upload #restart')).toBeHidden();
  await expectFullWidth(page);
  await expect(page.locator('#continue')).toBeDisabled();

  await page.getByLabel(/Endast reseräkning/).check();
  await expectFullWidth(page);
  await expect(page.locator('#continue')).toBeDisabled();
  await expect(page.locator('#travelFields')).toBeVisible();
  await expect(page.getByLabel('Antal kilometer')).toBeVisible();
  await expect(page.getByLabel('Antal kilometer')).toHaveAttribute('placeholder','Ange antal kilometer för att se ersättningen.');
  await expect(page.getByText('Har du rest med eget fordon och ska ha reseersättning?',{exact:true})).toHaveCount(0);
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByLabel('Antal kilometer').fill('10');
  await page.locator('#travelCalculation').click();
  await expect(page.locator('#continue')).toBeEnabled();

  await page.getByLabel(/Kvitton \+ reseräkning/).check();
  await expectFullWidth(page);
  await expect(page.locator('#continue')).toBeDisabled();
});
