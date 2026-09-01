async function boot(){
  const meta=window.__IDV_VERSION||{version:'dev',build:String(Date.now()),released:''};
  const build=encodeURIComponent(meta.build||meta.version||Date.now());
  const {applyTemplates}=await import(`./templates.js?v=${build}`);
  const response=await fetch(`app-base.html?v=${build}`,{cache:'no-store'});
  if(!response.ok)throw new Error('Kunde inte ladda formuläret');
  let html=await response.text();
  html=applyTemplates(html,meta);
  const dropzoneEnd='<span class="dropzone-delivery" id="deliveryNote">✉ Skickas till <strong>betala@idrottsveteranerna.se</strong></span></div>';
  html=html.replace(dropzoneEnd,dropzoneEnd+'<div class="privacy-link-row"><a class="privacy-link" href="privacy.html" target="_blank" rel="noopener">Så hanterar vi dina personuppgifter</a></div>');
  html=html.replace('</head>',`<link rel="stylesheet" href="styles/app.css?v=${build}"><link rel="stylesheet" href="styles/clarity.css?v=${build}"></head>`);
  html=html.replace('</body>',`<script type="module" src="js/app-ui.js?v=${build}"><\/script></body>`);
  document.open();
  document.write(html);
  document.close();
}

boot().catch(err=>{
  const bootEl=document.querySelector('.boot');
  if(bootEl)bootEl.textContent='Kunde inte ladda formuläret. Ladda om sidan.';
  console.error(err);
});
