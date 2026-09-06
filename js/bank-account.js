const CLEARING_RANGES=[
  [1100,1199],[1200,1399],[1400,2099],[2110,2189],[2300,2499],
  [3000,3409],[3410,4999],[5000,5999],[6000,6999],[7000,8999],
  [9020,9029],[9040,9049],[9060,9079],[9100,9109],[9120,9124],
  [9130,9199],[9230,9239],[9250,9259],[9270,9289],[9390,9449],
  [9460,9479],[9500,9599],[9600,9609],[9630,9689],[9700,9719],
  [9750,9759],[9780,9789],[9960,9969]
];

export function normalizeBankDigits(value){
  return String(value??'').replace(/\D/g,'');
}

export function isKnownClearingNumber(value){
  const digits=normalizeBankDigits(value);
  if(digits.length!==4)return false;
  const number=Number(digits);
  return CLEARING_RANGES.some(([from,to])=>number>=from&&number<=to);
}

export function isPlausibleAccountNumber(value){
  const digits=normalizeBankDigits(value);
  return digits.length>=7&&digits.length<=12;
}

export function validateBankAccount(clearing,account){
  const clearingNumber=normalizeBankDigits(clearing);
  const accountNumber=normalizeBankDigits(account);
  if(!isKnownClearingNumber(clearingNumber))return {valid:false,clearingNumber,accountNumber,message:'Kontrollera clearingnumret. Ange fyra siffror från en svensk clearingserie.'};
  if(!isPlausibleAccountNumber(accountNumber))return {valid:false,clearingNumber,accountNumber,message:'Kontrollera kontonumret. Ange 7–12 siffror utan clearingnummer.'};
  return {valid:true,clearingNumber,accountNumber,message:'Clearingnumret finns i en svensk clearingserie.'};
}

export function maskAccountNumber(value){
  const digits=normalizeBankDigits(value);
  return digits.length>4?'•••• '+digits.slice(-4):'••••';
}

export function initBankAccount(){
  const clearing=document.getElementById('clearingNumber');
  const account=document.getElementById('accountNumber');
  const status=document.getElementById('bankAccountStatus');
  if(!clearing||!account)return;

  const getData=()=>validateBankAccount(clearing.value,account.value);
  window.__idvBankAccount={getData};

  function sync(showErrors=false){
    const result=getData();
    clearing.setAttribute('aria-invalid',String(clearing.value.length>0&&!isKnownClearingNumber(clearing.value)));
    account.setAttribute('aria-invalid',String(account.value.length>0&&!isPlausibleAccountNumber(account.value)));
    if(status){
      const hasInput=clearing.value.length>0||account.value.length>0;
      status.textContent=hasInput&&(showErrors||result.valid)?result.message:'';
      status.dataset.state=result.valid?'valid':'error';
    }
    document.dispatchEvent(new CustomEvent('bank-account-change',{detail:result}));
  }

  for(const input of [clearing,account]){
    input.addEventListener('input',()=>{
      const normalized=normalizeBankDigits(input.value);
      if(input.value!==normalized)input.value=normalized;
      sync(false);
    });
    input.addEventListener('blur',()=>sync(true));
  }
  sync(false);
}
