import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

async function waitForAppState(page){
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
}

test('kombinationsflödet validerar kvitto och reseräkning',async({page})=>{
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":false}'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reference":"E2E"}'});
  });

  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await expect(page.getByText('Vad vill du skicka in?')).toBeVisible();
  await page.getByLabel(/Kvitton \+ reseräkning/).check();
  await expect(page.locator('#deliveryNote')).toContainText('betala@idrottsveteranerna.se');
  await expect(page.locator('.build-meta')).toContainText(`Version ${version}`);
  await waitForAppState(page);

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
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Ditt namn').fill('Testperson');
  await page.getByLabel('Din e-postadress').fill('test@example.se');
  await expect(page.locator('#travelFields')).toBeVisible();
  await page.getByLabel('Antal kilometer').fill('34');
  await page.getByLabel('Beskriv resan').fill('Hemmet till samlingen och tillbaka');
  await expect(page.locator('#travelCalculation')).toHaveText('34 km ÷ 10 × 25 kr = 85,00 kr');
  await page.getByLabel(/Jag godkänner det föreslagna/).check();
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();

  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('#summary')).toContainText('Kvitton + reseräkning');
  await expect(page.locator('#summary')).toContainText('125');
  await expect(page.locator('#summary')).toContainText('85,00 kr');
  await expect(page.locator('#summary')).toContainText('210,00 kr');
});

test('endast reseräkning går igenom utan kvittofil även efter uppladdat kvitto',async({page})=>{
  let submittedBody='';
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":false}'});
    submittedBody=route.request().postData()||'';
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"submission_mode":"travel"}'});
  });
  await page.goto('/');
  await waitForAppState(page);
  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=40;canvas.height=40;
    state.photos.push({name:'Kvitto som inte ska skickas',amount:'75',amountSource:'manual',ocrState:'manual',ocrMessage:'Test',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await page.getByLabel(/Endast reseräkning/).check();
  await expect(page.locator('#dropzone')).toBeHidden();
  await expect(page.getByRole('button',{name:'Nästa: dina uppgifter'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Ditt namn').fill('Resenär');
  await page.getByLabel('Din e-postadress').fill('resa@example.se');
  await page.getByLabel('Antal kilometer').fill('40');
  await page.getByLabel('Beskriv resan').fill('Tur och retur');
  await page.getByLabel(/Jag godkänner det föreslagna/).check();
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
  await expect(page.locator('#summary')).toContainText('Endast reseräkning');
  await expect(page.locator('#summary')).toContainText('100,00 kr');
  await page.locator('#confirm').check();
  await page.getByRole('button',{name:'Skicka in kvitton'}).click();
  await expect.poll(()=>submittedBody).toContain('name="submission_mode"');
  expect(submittedBody).toContain('travel');
  expect(submittedBody).not.toContain('name="receipts"');
  expect(submittedBody).not.toContain('name="receipt_names"');
  expect(submittedBody).not.toContain('name="receipt_amounts"');
  expect(submittedBody).not.toContain('Kvitto som inte ska skickas');
});

test('byte till endast kvitton nollställer reseuppgifter',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await page.getByLabel(/Endast reseräkning/).check();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Antal kilometer').fill('34');
  await page.getByLabel('Beskriv resan').fill('Tur och retur');
  await page.getByLabel(/Jag godkänner det föreslagna/).check();
  await page.evaluate(()=>window.__idvReceiptState.show('upload'));
  await page.getByLabel(/Endast kvitton/).check();
  const travel=await page.evaluate(()=>window.__idvTravel.getData());
  expect(travel).toEqual({enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''});
});

test('integritetslänken ligger under uppladdningen och bevarar uppladdat kvitto',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await waitForAppState(page);
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
  const popupPromise=page.waitForEvent('popup');
  await privacyLink.click();
  const popup=await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/privacy\.html$/);
  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await popup.close();
});
