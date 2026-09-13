import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

async function waitForAppState(page){
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
  const start=page.getByRole('button',{name:'Starta ansökan'});
  if(await start.isVisible())await start.click();
}

async function fillProfileAndContinue(page,{name='Testperson',email='test@example.se',clearing='5000',account='1234567'}={}){
  await page.getByLabel('Ditt namn').fill(name);
  await page.getByLabel('Din e-postadress').fill(email);
  await page.getByLabel('Clearingnummer').fill(clearing);
  await page.getByLabel('Kontonummer').fill(account);
  await page.getByRole('button',{name:'Nästa: välj ersättning'}).click();
}

async function addTestReceipt(page,{name='Testkvitto',amount='125'}={}){
  await page.evaluate(({name,amount})=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=120;canvas.height=80;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,120,80);
    ctx.fillStyle='#111';ctx.font='14px sans-serif';ctx.fillText(`${name} ${amount} kr`,8,42);
    state.photos.push({name,amount,amountSource:'manual',ocrState:'manual',ocrMessage:'Testbelopp',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  },{name,amount});
}

test('kombinationsflödet validerar kvitto och milersättning',async({page})=>{
  let submittedBody='';
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":true}'});
    submittedBody=route.request().postData()||'';
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reference":"E2E","delivery_sent":true}'});
  });

  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Ansök om ersättning'})).toBeVisible();
  await waitForAppState(page);
  await expect(page.getByRole('heading',{name:'Dina uppgifter'})).toBeVisible();
  await fillProfileAndContinue(page);
  await expect(page.getByRole('heading',{name:'Välj ersättning'})).toBeVisible();
  await page.getByLabel(/Kvitton för utlägg/).check();
  await page.getByLabel(/^Milersättning/).check();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Resa till samlingen');
  await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('34');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeDisabled();
  await expect(page.locator('#travelCalculation')).toContainText('Klicka här för att godkänna:');
  await expect(page.locator('#deliveryNote')).toContainText('betala@idrottsveteranerna.se');
  await expect(page.locator('.build-meta')).toContainText(`Version ${version}`);
  await waitForAppState(page);

  await addTestReceipt(page);

  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeDisabled();
  await page.locator('#travelCalculation').click();
  await expect(page.locator('#travelCalculation')).toContainText('Godkänd:');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await expect(page.locator('#cc')).toBeEnabled();
  await expect(page.locator('#cc')).toBeChecked();
  await expect(page.locator('.copy-option small')).toContainText('samma sammanställning och PDF');
  await expect(page.locator('#travelFields')).toBeVisible();
  await expect(page.locator('#travelCalculation')).toHaveText('✓ Godkänd: 34 km ÷ 10 × 25 kr = 85,00 kr');
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();

  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('.review-copy-option')).toBeVisible();
  await expect(page.locator('#cc')).toBeChecked();
  await expect(page.locator('#summary')).toContainText('Kvitton + milersättning');
  await expect(page.locator('#summary')).toContainText('125');
  await expect(page.locator('#summary')).toContainText('85,00 kr');
  await expect(page.locator('#summary')).toContainText('210,00 kr');
  await expect(page.locator('#summary')).toContainText('Clearing 5000 · •••• 4567');
  await expect(page.locator('#summary')).not.toContainText('1234567');
  await page.locator('#confirm').check();
  await page.getByRole('button',{name:'Skicka in underlaget'}).click();
  await expect.poll(()=>submittedBody).toContain('name="submission_mode"');
  expect(submittedBody).toContain('combined');
  expect(submittedBody).toContain('name="receipts"');
  await expect(page.getByRole('heading',{name:/Tack! Vi har tagit emot/})).toBeVisible();
});

test('endast kvitton går genom alla steg med ett ifyllt tillfälle',async({page})=>{
  let submittedBody='';
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":true}'});
    submittedBody=route.request().postData()||'';
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reference":"KVITTO","delivery_sent":true}'});
  });
  await page.goto('/');
  await waitForAppState(page);
  await fillProfileAndContinue(page,{name:'Kvittoägare',email:'kvitto@example.se'});
  await page.getByLabel(/Kvitton för utlägg/).check();
  await addTestReceipt(page,{name:'Hotell',amount:'540'});
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await page.locator('#confirm').check();
  await page.getByRole('button',{name:'Skicka in underlaget'}).click();
  await expect.poll(()=>submittedBody).toContain('name="submission_mode"');
  expect(submittedBody).toContain('receipts');
  expect(submittedBody).toContain('name="receipts"');
  await expect(page.getByRole('heading',{name:/Tack! Vi har tagit emot/})).toBeVisible();
});

test('endast milersättning går igenom utan kvittofil även efter uppladdat kvitto',async({page})=>{
  let submittedBody='';
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":false}'});
    submittedBody=route.request().postData()||'';
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"submission_mode":"travel","delivery_sent":true,"copy_requested":false,"final_pdf_url":"https://example.test/submitted.pdf"}'});
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
  await fillProfileAndContinue(page,{name:'Resenär',email:'resa@example.se',clearing:'6000',account:'7654321'});
  await page.getByLabel(/^Milersättning/).check();
  await expect(page.locator('#dropzone')).toBeHidden();
  await expect(page.locator('.missing-receipt')).toBeHidden();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Tur och retur till samlingen');
  await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('40');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeDisabled();
  await page.locator('#travelCalculation').click();
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await expect(page.getByLabel('Tillfälle eller kort beskrivning av resan')).toHaveValue('Tur och retur till samlingen');
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('#summary')).toContainText('Endast milersättning');
  await expect(page.locator('#summary')).toContainText('100,00 kr');
  await page.locator('#confirm').check();
  await page.getByRole('button',{name:'Skicka in underlaget'}).click();
  await expect.poll(()=>submittedBody).toContain('name="submission_mode"');
  expect(submittedBody).toContain('travel');
  expect(submittedBody).toContain('name="clearing_number"');
  expect(submittedBody).toContain('name="account_number"');
  expect(submittedBody).not.toContain('name="receipts"');
  expect(submittedBody).not.toContain('name="receipt_names"');
  expect(submittedBody).not.toContain('name="receipt_amounts"');
  expect(submittedBody).not.toContain('Kvitto som inte ska skickas');
  await expect(page.getByRole('link',{name:/PDF/i})).toHaveAttribute('href','https://example.test/submitted.pdf');
});

test('kvitto måste ha namn före granskning',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await fillProfileAndContinue(page);
  await page.getByLabel(/Kvitton för utlägg/).check();
  await page.evaluate(()=>{
    const state=window.__idvReceiptState,canvas=document.createElement('canvas');
    canvas.width=20;canvas.height=20;
    state.photos.push({name:'',amount:'10',amountSource:'manual',ocrState:'manual',ocrMessage:'Test',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeDisabled();
});

test('avstängd milersättning nollställer reseuppgifter',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await fillProfileAndContinue(page);
  await page.getByLabel(/^Milersättning/).check();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByRole('spinbutton',{name:'Antal kilometer'}).fill('34');
  await page.locator('#travelCalculation').click();
  await page.getByLabel(/^Milersättning/).uncheck();
  const travel=await page.evaluate(()=>window.__idvTravel.getData());
  expect(travel).toEqual({enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''});
});

test('integritetslänken ligger i säkerhetsfotnoten och bevarar uppladdat kvitto',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await expect(page.getByRole('heading',{name:'Dina uppgifter'})).toBeVisible();
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
  await expect(privacyLink.locator('..')).toHaveClass(/security-note/);
  const popupPromise=page.waitForEvent('popup');
  await privacyLink.click();
  const popup=await popupPromise;
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/privacy\.html$/);
  await expect(page.locator('.receipt-item')).toHaveCount(1);
  await popup.close();
});

test('avrundat OCR-förslag pulserar tills det används',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await fillProfileAndContinue(page);
  await page.getByLabel(/Kvitton för utlägg/).check();
  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    const canvas=document.createElement('canvas');
    canvas.width=20;canvas.height=20;
    state.photos.push({name:'Avrundningstest',amount:'',amountSource:'',ocrSuggestion:'22',ocrState:'suggested',ocrMessage:'OCR-förslag – kontrollera beloppet',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  const suggestion=page.locator('.receipt-hint[data-state="suggested"]');
  await expect(suggestion).toContainText('22 kr (avrundat till hel krona)');
  expect(await suggestion.evaluate(element=>getComputedStyle(element).animationName)).toBe('ocr-suggestion-pulse');
  await suggestion.click();
  await expect(page.getByLabel('Belopp för kvitto 1')).toHaveValue('22');
  await expect(page.locator('.receipt-hint[data-state="accepted"]')).toHaveText('✓ OCR-förslaget används');
  await expect(page.locator('.receipt-hint[data-state="suggested"]')).toHaveCount(0);
});

test('ett hängande OCR-kvitto lämnar nästa kvitto tydligt i kön',async({page})=>{
  await page.addInitScript(()=>{
    let workerCount=0;
    window.Tesseract={createWorker:async()=>{
      const workerId=++workerCount;
      return {
        setParameters:async()=>{},
        recognize:()=>workerId===1?new Promise(()=>{}):Promise.resolve({data:{text:'TOTAL 42,00 kr'}}),
        terminate:async()=>{}
      };
    }};
  });
  await page.goto('/');
  await waitForAppState(page);
  await page.evaluate(()=>{
    const state=window.__idvReceiptState;
    [1,2].forEach(index=>state.photos.push({name:`Testkvitto ${index}`,amount:'',amountSource:'',canvas:document.createElement('canvas'),masks:[],done:false,pdf:false}));
    state.render();
    window.__ocrTestStates=[{state:'queued',message:''},{state:'queued',message:''}];
    window.__ocrTestStates.forEach(item=>{
      document.dispatchEvent(new CustomEvent('receipt-ready-for-ocr',{detail:{
        canvas:document.createElement('canvas'),
        getAmount:()=>'',
        setSuggestion:()=>{},
        setOcrState:(state,message)=>{item.state=state;item.message=message}
      }}));
    });
  });
  await expect.poll(()=>page.evaluate(()=>window.__ocrTestStates[0].state)).toBe('working');
  await expect.poll(()=>page.evaluate(()=>window.__ocrTestStates[1].state)).toBe('queued');
  await expect(page.getByLabel('Belopp för kvitto 1')).toBeEditable();
});
