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
  await expect(page.locator('#travelFields')).toBeHidden();
  await page.getByRole('checkbox',{name:'Har du rest med eget fordon och ska ha reseersättning?'}).check();
  await page.getByLabel('Antal kilometer').fill('34');
  await page.getByLabel('Beskriv resan').fill('Hemmet till samlingen och tillbaka');
  await expect(page.locator('#travelCalculation')).toHaveText('34 km ÷ 10 × 24 kr = 81,60 kr');
  await page.getByLabel(/Jag godkänner det föreslagna/).check();
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();

  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('#summary')).toContainText('Testperson');
  await expect(page.locator('#summary')).toContainText('125');
  await expect(page.locator('#summary')).toContainText('81,60 kr');
  await expect(page.locator('#summary')).toContainText('206,60 kr');
  await page.evaluate(()=>{
    const amount=document.querySelector('#reviewFiles .review-amount-wrap input');
    amount.value='150';
    amount.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('#summary .receipt-total')).toContainText('150,00 kr');
  await expect(page.locator('#summary .grand-total')).toContainText('231,60 kr');
  await page.locator('#confirm').check();
  await expect(page.getByRole('button',{name:'Skicka in kvitton'})).toBeEnabled();
});

test('reseersättning kan ändras och stängas av utan kvarvarande belopp',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await page.evaluate(()=>window.__idvReceiptState.show('form'));
  await page.getByRole('checkbox',{name:'Har du rest med eget fordon och ska ha reseersättning?'}).check();
  await page.getByLabel('Antal kilometer').fill('34');
  await page.getByLabel('Beskriv resan').fill('Tur och retur');
  await page.getByLabel(/Jag godkänner det föreslagna/).check();
  await page.getByLabel('Antal kilometer').fill('40');
  await expect(page.getByLabel(/Jag godkänner det föreslagna/)).not.toBeChecked();
  await expect(page.locator('#travelCalculation')).toHaveText('40 km ÷ 10 × 24 kr = 96,00 kr');
  await page.getByRole('checkbox',{name:'Har du rest med eget fordon och ska ha reseersättning?'}).uncheck();
  const travel=await page.evaluate(()=>window.__idvTravel.getData());
  expect(travel).toEqual({enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''});
});

test('integritetslänken ligger under uppladdningen och bevarar uppladdat kvitto',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=20;canvas.height=20;
    state.photos.push({name:'Sparat kvitto',amount:'50',amountSource:'manual',ocrState:'manual',ocrMessage:'Test',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  await expect(page.locator('.receipt-item')).toHaveCount(1);
  const privacyLink=page.getByRole('link',{name:/personuppgifter/i});
  await expect(privacyLink).toBeVisible();
  await expect(page.locator('.dropzone + .privacy-link-row')).toContainText('Så hanterar vi dina personuppgifter');
  const popupPromise=page.waitForEvent('popup');
  await privacyLink.click();
  const popup=await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/privacy\.html$/);
  await expect(popup.getByRole('heading',{name:'Så hanterar vi dina personuppgifter'})).toBeVisible();
  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await expect(page.locator('.receipt-name')).toHaveValue('Sparat kvitto');
  await popup.close();
});
