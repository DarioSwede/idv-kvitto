import {test,expect} from '@playwright/test';

async function waitForAppState(page){
  if(await page.locator('input[name="submissionMode"]:checked').count()===0){
    await page.getByLabel(/Endast kvitton/).check();
  }
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
}

test('toppmenyn visar bara lägesvalen',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.timeline')).toBeVisible();
  await expect(page.locator('.timeline .seg')).toHaveCount(3);
  await expect(page.locator('.timeline .seg-label').nth(0)).toHaveText('Kvitton');
  await expect(page.getByText('Vad vill du göra?')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await expect(page.getByLabel(/Endast kvitton/)).toBeChecked();
  await expect(page.locator('.submission-information-card')).toHaveCount(0);
  await expect(page.getByLabel(/Endast kvitton/)).toBeVisible();
  await expect(page.getByLabel(/Endast reseräkning/)).toBeVisible();
  await expect(page.getByLabel(/Kvitton \+ reseräkning/)).toBeVisible();
  await page.getByLabel(/Endast reseräkning/).check();
  await expect(page.locator('.timeline .seg-label').nth(0)).toHaveText('Reseersättning');
});

test('nästa-knappen centreras bara i tomt kvittoläge',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  const actions=page.locator('#upload .receipt-actions');
  await expect(actions).toHaveClass(/continue-centered/);
  await expect(page.locator('body')).toHaveAttribute('data-has-receipts','false');

  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=20;canvas.height=20;
    state.photos.push({name:'Layouttest',amount:'50',amountSource:'manual',ocrState:'manual',ocrMessage:'Test',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  await expect(page.locator('body')).toHaveAttribute('data-has-receipts','true');
  await expect(actions).not.toHaveClass(/continue-centered/);

  await page.evaluate(()=>{
    window.__idvReceiptState.photos.splice(0);
    window.__idvReceiptState.render();
  });
  await expect(actions).toHaveClass(/continue-centered/);
  await page.getByLabel(/Endast reseräkning/).check();
  await expect(actions).not.toHaveClass(/continue-centered/);
});

test('ensamma huvudknappar centreras i senare steg',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await page.getByLabel(/Endast reseräkning/).check();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Tur och retur till samlingen');
  await page.getByLabel('Antal kilometer').fill('10');
  await page.locator('#travelCalculation').click();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();

  const formButton=page.locator('#form #previewBtn');
  const formBox=await page.locator('#form').boundingBox();
  const formButtonBox=await formButton.boundingBox();
  expect(formBox&&formButtonBox).toBeTruthy();
  expect(Math.abs((formButtonBox.x+formButtonBox.width/2)-(formBox.x+formBox.width/2))).toBeLessThan(2);
  expect(formButtonBox.width).toBeLessThanOrEqual(360.5);

  await page.getByLabel('Ditt namn').fill('Layouttest');
  await page.getByLabel('Din e-postadress').fill('layout@example.se');
  await page.getByLabel('Clearingnummer').fill('5000');
  await page.getByLabel('Kontonummer').fill('1234567890');
  await formButton.click();

  const sendButton=page.locator('#preview #send');
  const previewBox=await page.locator('#preview').boundingBox();
  const sendBox=await sendButton.boundingBox();
  expect(previewBox&&sendBox).toBeTruthy();
  expect(Math.abs((sendBox.x+sendBox.width/2)-(previewBox.x+previewBox.width/2))).toBeLessThan(2);
  expect(sendBox.width).toBeLessThanOrEqual(360.5);
});
