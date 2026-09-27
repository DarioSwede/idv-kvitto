// Navigation only. Data access still passes the server's SU authorization.
export function setupAdminNavigation(){
  const titles={overview:'Adminöversikt',users:'Användare',settings:'Systeminställningar',email:'Testmejl',audit:'Säkerhetslogg'};
  const links=[...document.querySelectorAll('[data-admin-view]')];
  const heading=document.querySelector('.admin-page-title');
  const show=(focus=false)=>{
    const requested=location.hash.slice(1);
    const view=Object.hasOwn(titles,requested)?requested:'overview';
    document.querySelectorAll('[data-admin-panel]').forEach(panel=>{panel.hidden=panel.dataset.adminPanel!==view;});
    links.forEach(link=>{
      if(link.dataset.adminView===view)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    heading.textContent=titles[view];document.title=`${titles[view]} – IDV`;
    if(focus)heading.focus({preventScroll:true});
    if(view==='audit')document.querySelector('#loadAudit').click();
  };
  window.addEventListener('hashchange',()=>show(true));
  show();
}
