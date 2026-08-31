import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

test('kvittoflödet startar, validerar och når slutkontrollen',async({page})=>{
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":false}'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reference":"E2E"}'});
  });

  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await expect(page.locator('#deliveryNote')).toContainText('betala@idrottsveteranerna.se');
  await expect(page.locator('.build-meta')).toContainText(`Version ${version}`);
  await expect(page.getByRole('link',{name:/personuppgifter/i})).toBeVisible();

  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=120;canvas.height=80;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,120,80);
    ctx.fillStyle='#111';ctx.font='14px sans-serif';ctx.fillText('TESTKVITTO 125 kr',8,42);
    state.photos.push({name:'Testkvitto',amount:'125',amountSource:'manual',ocrState:'manual',ocrMessage:'Testbelopp',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });

  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Nästa: dina uppgifter'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();

  await expect(page.getByRole('heading',{name:'Vem gäller kvittot?'})).toBeVisible();
  await page.getByLabel('Ditt namn').fill('Testperson');
  await page.getByLabel('Din e-postadress').fill('test@example.se');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera kvittona'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: kontrollera kvittona'}).click();

  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('#summary')).toContainText('Testperson');
  await expect(page.locator('#summary')).toContainText('125');
  await page.locator('#confirm').check();
  await expect(page.getByRole('button',{name:'Skicka in kvitton'})).toBeEnabled();
});

test('integritetssidan är nåbar från formuläret',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/personuppgifter/i}).click();
  await expect(page).toHaveURL(/privacy\.html$/);
  await expect(page.getByRole('heading',{name:'Så hanterar vi dina personuppgifter'})).toBeVisible();
  await expect(page.getByText(/HTTPS\/TLS/)).toBeVisible();
});
