import {test,expect} from '@playwright/test';

async function openCompensationStep(page){
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
  await page.getByLabel('Ditt namn').fill('Layouttest');
  await page.getByLabel('Din e-postadress').fill('layout@example.se');
  await page.getByLabel('Clearingnummer').fill('5000');
  await page.getByLabel('Kontonummer').fill('1234567');
  await page.getByRole('button',{name:'Nästa: välj ersättning'}).click();
}

test('toppmenyn visar det gemensamma trestegsflödet',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.timeline .seg')).toHaveCount(3);
  await expect(page.locator('.timeline .seg-label')).toHaveText(['Dina uppgifter','Välj ersättning','Kontroll & skicka']);
  await expect(page.getByRole('heading',{name:'Dina uppgifter'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Nästa: välj ersättning'})).toBeDisabled();
});

test('ersättningstyperna kan väljas oberoende och öppnar rätt fält',async({page})=>{
  await openCompensationStep(page);
  await expect(page.getByText('Vad söker du ersättning för?')).toBeVisible();
  await expect(page.getByLabel(/Kvitton för utlägg/)).not.toBeChecked();
  await expect(page.getByLabel(/^Milersättning/)).not.toBeChecked();
  await page.getByLabel(/Kvitton för utlägg/).check();
  await expect(page.locator('.compensation-section').first()).toBeVisible();
  await expect(page.locator('.compensation-section').nth(1)).toBeHidden();
  await page.getByLabel(/^Milersättning/).check();
  await expect(page.locator('.compensation-section').nth(1)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Resan'})).toBeVisible();
});

test('steg två skapar kombinationsläget automatiskt när båda valen är aktiva',async({page})=>{
  await openCompensationStep(page);
  await page.getByLabel(/Kvitton för utlägg/).check();
  await page.getByLabel(/^Milersättning/).check();
  await expect(page.locator('body')).toHaveAttribute('data-submission-mode','combined');
  await expect(page.locator('#event')).toBeVisible();
  await expect(page.locator('.travel-card')).toBeVisible();
  await expect(page.locator('#dropzone')).toBeVisible();
});

test('huvudknappen på första steget är centrerad',async({page})=>{
  await page.goto('/');
  const formButton=page.locator('#form #previewBtn');
  const formBox=await page.locator('#form').boundingBox();
  const formButtonBox=await formButton.boundingBox();
  expect(formBox&&formButtonBox).toBeTruthy();
  expect(Math.abs((formButtonBox.x+formButtonBox.width/2)-(formBox.x+formBox.width/2))).toBeLessThan(2);
  expect(formButtonBox.width).toBeLessThanOrEqual(360.5);
});
