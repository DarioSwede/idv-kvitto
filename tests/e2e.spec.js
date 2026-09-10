import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

async function waitForAppState(page){
  if(await page.locator('input[name="submissionMode"]:checked').count()===0){
    await page.getByLabel(/Endast kvitton/).check();
  }
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
}

test('kombinationsflödet validerar kvitto och reseräkning',async({page})=>{
  await page.route('**/functions/v1/**',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'{"email_configured":true}'});
    return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"reference":"E2E"}'});
  });

  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Lägg till kvitton'})).toBeVisible();
  await expect(page.getByText('Vad vill du göra?')).toBeVisible();
  await page.getByLabel(/Kvitton \+ reseräkning/).check();
  await expect(page.getByRole('heading',{name:'Kvitton och reseräkning'})).toBeVisible();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Resa till samlingen');
  await page.getByLabel('Antal kilometer').fill('34');
  await expect(page.getByRole('button',{name:'Nästa: dina uppgifter'})).toBeDisabled();
  await page.locator('#travelCalculation').click();
  await expect(page.locator('#deliveryNote')).toContainText('mail@torbjornzimmerman.se');
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
  await expect(page.getByRole('button',{name:'Nästa: dina uppgifter'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Ditt namn').fill('Testperson');
  await page.getByLabel('Din e-postadress').fill('test@example.se');
  await page.getByLabel('Clearingnummer').fill('9999');
  await page.getByLabel('Kontonummer').fill('1234567890');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeDisabled();
  await page.getByLabel('Clearingnummer').fill('5000');
  await page.getByLabel('Kontonummer').fill('1234-5678-7890');
  await expect(page.getByLabel('Kontonummer')).toHaveValue('123456787890');
  await expect(page.locator('#bankAccountStatus')).toContainText('5000 (SEB)');
  await expect(page.locator('#cc')).toBeEnabled();
  await expect(page.locator('#cc')).toBeChecked();
  await expect(page.locator('.copy-option small')).toContainText('samma sammanställning och PDF');
  await expect(page.locator('#travelFields')).toBeVisible();
  await expect(page.locator('#travelCalculation')).toHaveText('34 km ÷ 10 × 25 kr = 85,00 kr');
  await expect(page.getByRole('button',{name:'Nästa: kontrollera och skicka'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();

  await expect(page.getByRole('heading',{name:'Stämmer allt?'})).toBeVisible();
  await expect(page.locator('.review-copy-option')).toBeVisible();
  await expect(page.locator('#cc')).toBeChecked();
  await expect(page.locator('#summary')).toContainText('Kvitton + kilometerersättning');
  await expect(page.locator('#summary')).toContainText('125');
  await expect(page.locator('#summary')).toContainText('85,00 kr');
  await expect(page.locator('#summary')).toContainText('210,00 kr');
  await expect(page.locator('#summary')).toContainText('Clearing 5000 · •••• 7890');
  await expect(page.locator('#summary')).not.toContainText('1234567890');
});

test('endast reseräkning går igenom utan kvittofil även efter uppladdat kvitto',async({page})=>{
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
  await page.getByLabel(/Endast reseräkning/).check();
  await expect(page.getByRole('heading',{name:'Reseersättning'})).toBeVisible();
  await expect(page.locator('#dropzone')).toBeHidden();
  await expect(page.locator('.missing-receipt')).toBeHidden();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Tur och retur till samlingen');
  await page.getByLabel('Antal kilometer').fill('40');
  await page.locator('#travelCalculation').click();
  await expect(page.getByRole('button',{name:'Nästa: dina uppgifter'})).toBeEnabled();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Ditt namn').fill('Resenär');
  await page.getByLabel('Din e-postadress').fill('resa@example.se');
  await page.getByLabel('Clearingnummer').fill('6000');
  await page.getByLabel('Kontonummer').fill('7654321');
  await expect(page.getByLabel('Tillfälle eller kort beskrivning av resan')).toHaveValue('Tur och retur till samlingen');
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
  await expect(page.locator('#summary')).toContainText('Endast reseräkning');
  await expect(page.locator('#summary')).toContainText('100,00 kr');
  await page.locator('#confirm').check();
  await page.getByRole('button',{name:'Skicka in kvitton'}).click();
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
  await page.evaluate(()=>{
    const state=window.__idvReceiptState,canvas=document.createElement('canvas');
    canvas.width=20;canvas.height=20;
    state.photos.push({name:'',amount:'10',amountSource:'manual',ocrState:'manual',ocrMessage:'Test',canvas,masks:[],done:true,pdf:false,processing:false});
    state.render();
  });
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.getByLabel('Ditt namn').fill('Testperson');
  await page.getByLabel('Din e-postadress').fill('test@example.se');
  await page.getByLabel('Clearingnummer').fill('5000');
  await page.getByLabel('Kontonummer').fill('1234567');
  await page.getByRole('button',{name:'Nästa: kontrollera och skicka'}).click();
  await expect(page.locator('#formError')).toContainText('Ange vad varje kvitto gäller');
});

test('byte till endast kvitton nollställer reseuppgifter',async({page})=>{
  await page.goto('/');
  await waitForAppState(page);
  await page.getByLabel(/Endast reseräkning/).check();
  await page.getByLabel('Tillfälle eller kort beskrivning av resan').fill('Testresa');
  await page.getByLabel('Antal kilometer').fill('34');
  await page.locator('#travelCalculation').click();
  await page.getByRole('button',{name:'Nästa: dina uppgifter'}).click();
  await page.evaluate(()=>window.__idvReceiptState.show('upload'));
  await page.getByLabel(/Endast kvitton/).check();
  const travel=await page.evaluate(()=>window.__idvTravel.getData());
  expect(travel).toEqual({enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''});
});

test('integritetslänken ligger i säkerhetsfotnoten och bevarar uppladdat kvitto',async({page})=>{
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
