const CLEARING_RANGES=[
  [1000,1099],[1100,1199],[1200,1399],[1400,2099],[2110,2189],[2300,2499],
  [3000,3409],[3410,4999],[5000,5999],[6000,6999],[7000,8999],
  [9020,9029],[9040,9049],[9060,9079],[9100,9109],[9120,9124],
  [9130,9199],[9230,9239],[9250,9259],[9270,9289],[9390,9449],
  [9460,9479],[9500,9599],[9600,9609],[9630,9689],[9700,9719],
  [9750,9759],[9780,9789],[9960,9969]
];

const BANK_CLEARING_RANGES=[
  [1000,1099,'Sveriges riksbank'],[1100,1199,'Nordea'],[1200,1399,'Danske Bank'],
  [1400,2099,'Nordea'],[2110,2119,'Juni Technology AB'],[2120,2129,'Steven AB'],
  [2130,2139,'Zimpler AB'],[2140,2149,'Trustly Group AB'],[2150,2159,'Revolut Bank UAB'],
  [2160,2169,'Trade Republic Bank'],[2300,2399,'Ålandsbanken'],[2400,2499,'Danske Bank'],
  [3000,3299,'Nordea'],[3300,3300,'Nordea Personkonto'],[3301,3399,'Nordea'],
  [3400,3409,'Länsförsäkringar Bank'],[3410,3781,'Nordea'],[3782,3782,'Nordea Personkonto'],
  [3783,4999,'Nordea'],[5000,5999,'SEB'],[6000,6999,'Handelsbanken'],[7000,7999,'Swedbank'],
  [8018,8018,'Attmars Sparbank'],[8030,8030,'Ölands Bank'],[8032,8032,'Swedbank Sjuhärad'],
  [8050,8050,'Ekeby Sparbank'],[8059,8059,'Sparbanken Boken'],[8060,8060,'Falkenbergs Sparbank'],
  [8103,8103,'Swedbank Gävleborgs län'],[8129,8129,'Hälsinglands Sparbank'],[8148,8148,'Järvsö Sparbank'],
  [8153,8153,'Sparbanken i Karlshamn'],[8158,8158,'Kinda-Ydre Sparbank'],[8169,8169,'Swedbank'],
  [8182,8182,'Sparbanken Västra Mälardalen'],[8183,8183,'Laholms Sparbank'],[8201,8201,'Swedbank Norrbottens län'],
  [8217,8217,'Markaryds Sparbank'],[8239,8239,'Snapphanebygdens Sparbank'],[8242,8242,'Roslagens Sparbank'],
  [8250,8250,'Närs Sparbank'],[8257,8257,'Sörmlands Sparbank'],[8264,8264,'Sparbanken Nord'],
  [8284,8284,'Sala Sparbank'],[8286,8286,'Sidensjö Sparbank'],[8289,8289,'Sparbanken Skaraborg'],
  [8295,8295,'Skurups Sparbank'],[8304,8304,'Sparbanken Alingsås'],[8305,8305,'Sparbanken i Enköping'],
  [8313,8313,'Sparbanken Skåne'],[8314,8314,'Sparbanken Lidköping'],[8321,8321,'Sölvesborg-Mjällby sparbank'],
  [8327,8327,'Swedbank Stockholms län'],[8331,8331,'Häradssparbanken Mönsterås'],[8336,8336,'Fryksdalens Sparbank'],
  [8346,8346,'Södra Hestra Sparbank'],[8353,8353,'Orusts Sparbank'],[8354,8354,'Tidaholms Sparbank'],
  [8356,8356,'Tjörns Sparbank'],[8384,8384,'Valdemarsviks Sparbank'],[8388,8388,'Varbergs Sparbank'],
  [8393,8393,'Lönneberga-Tuna-Vena Sparbank'],[8401,8401,'Vimmerby Sparbank'],[8405,8405,'Virserums Sparbank'],
  [8422,8422,'Sparbanken Spira'],[8424,8424,'Swedbank Västmanlands län'],[8431,8431,'Swedbank Värmlands län'],
  [9000,9019,'Okänd bank'],[9020,9029,'Länsförsäkringar Bank'],[9040,9049,'Citibank'],
  [9060,9069,'Länsförsäkringar Bank'],[9070,9079,'Multitude Bank'],[9100,9109,'Nordnet Bank'],
  [9120,9149,'SEB'],[9150,9169,'Skandiabanken'],[9170,9179,'Ikano Bank'],
  [9180,9189,'Danske Bank'],[9190,9199,'DNB'],[9230,9239,'Marginalen Bank'],
  [9250,9259,'SBAB Bank'],[9270,9279,'ICA Banken'],[9280,9289,'Resurs Bank'],
  [9300,9349,'Swedbank'],[9390,9399,'Landshypotek Bank'],[9400,9449,'Forex'],
  [9460,9469,'Santander Consumer Bank'],[9470,9479,'BNP Paribas'],[9500,9549,'Nordea'],
  [9550,9569,'Avanza Bank'],[9570,9579,'Sparbanken Syd'],[9580,9589,'AION Bank'],
  [9590,9599,'EP Bank'],[9600,9609,'Banking Circle'],[9630,9639,'Lån & Spar Bank'],
  [9640,9649,'Noba Bank Group'],[9650,9659,'MedMera Bank'],[9660,9669,'Svea Bank'],
  [9670,9679,'JAK Medlemsbank'],[9680,9689,'Enity Bank Group'],[9700,9709,'Ekobanken'],
  [9710,9719,'Lunar Bank'],[9750,9759,'Northmill Bank'],[9770,9779,'Intergiro'],
  [9780,9789,'Klarna Bank'],[9860,9869,'Privatgirot'],[9870,9879,'Nasdaq-OMX'],
  [9880,9889,'Riksgälden'],[9960,9969,'Nordea']
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

export function getBankForClearingNumber(value){
  const digits=normalizeBankDigits(value);
  if(digits.length!==4)return '';
  const number=Number(digits);
  return BANK_CLEARING_RANGES.find(([from,to])=>number>=from&&number<=to)?.[2]||'';
}

export function isPlausibleAccountNumber(value){
  const digits=normalizeBankDigits(value);
  return digits.length>=7&&digits.length<=12;
}

export function validateBankAccount(clearing,account){
  const clearingNumber=normalizeBankDigits(clearing);
  const accountNumber=normalizeBankDigits(account);
  if(!isKnownClearingNumber(clearingNumber))return {valid:false,clearingNumber,accountNumber,message:'Kontrollera clearingnumret. Ange fyra siffror från en svensk clearingserie.'};
  const bankName=getBankForClearingNumber(clearingNumber);
  const clearingMessage=bankName?`Clearingnummer ${clearingNumber} (${bankName}).`:'Clearingnumret finns i en svensk clearingserie.';
  if(!isPlausibleAccountNumber(accountNumber))return {valid:false,clearingNumber,accountNumber,message:`${clearingMessage} Ange ett kontonummer med 7–12 siffror utan clearingnummer.`};
  return {valid:true,clearingNumber,accountNumber,message:clearingMessage};
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
