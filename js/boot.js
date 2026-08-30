import {applyTemplates} from './templates.js?v=20260830-3';

async function boot(){
  const response=await fetch('app-base.html?v=20260830-3',{cache:'no-store'});
  if(!response.ok)throw new Error('Kunde inte ladda formuläret');
  let html=await response.text();
  html=applyTemplates(html);
  html=html.replace('</head>','<link rel="stylesheet" href="styles/app.css?v=20260830-3"><style>.timeline{margin-right:0!important;width:100%!important}@media(max-width:430px){.timeline{margin-right:0!important}}</style></head>');
  html=html.replace('</body>','<script type="module" src="js/app-ui.js?v=20260830-3"><\/script></body>');
  document.open();
  document.write(html);
  document.close();
}

boot().catch(err=>{
  const bootEl=document.querySelector('.boot');
  if(bootEl)bootEl.textContent='Kunde inte ladda formuläret. Ladda om sidan.';
  console.error(err);
});
