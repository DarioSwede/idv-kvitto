import {test,expect} from '@playwright/test';

async function waitForAppState(page){
  await page.waitForFunction(()=>Boolean(window.__idvReceiptState?.photos));
}

test('toppmenyn visar tre sammanhållna steg',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.timeline .seg')).toHaveCount(3);
  await expect(page.locator('.timeline .seg-index')).toHaveCount(3);
  await expect(page.locator('.timeline')).toContainText('Kvitton');
  await expect(page.locator('.timeline')).toContainText('Dina uppgifter');
  await expect(page.locator('.timeline')).toContainText('Kontroll & skicka');
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
