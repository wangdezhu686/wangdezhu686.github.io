(() => {
  'use strict';
  const open = document.querySelector('#search-button .search');
  const close = document.querySelector('#local-search .search-close-button');
  const dialog = document.querySelector('#local-search .search-dialog');
  const menu = document.querySelector('#toggle-menu .site-page');
  for (const [button, label] of [[open,'搜索文章'],[menu,'打开导航']]) {
    if (!button) continue;
    button.setAttribute('role','button');
    button.setAttribute('tabindex','0');
    button.setAttribute('aria-label',label);
    button.addEventListener('keydown', event => {
      if (['Enter',' '].includes(event.key)) {event.preventDefault();button.click();}
    });
  }
  if (open && dialog && close) {
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-label','搜索文章');
    close.setAttribute('aria-label','关闭搜索');
    document.addEventListener('keydown',event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k') {
        event.preventDefault();
        if (dialog.offsetWidth) close.click(); else open.click();
      }
    });
    const handle=dialog.querySelector('.search-nav');
    let drag;
    handle.addEventListener('pointerdown',event => {
      if (event.pointerType!=='touch' || event.target.closest('button') || !matchMedia('(max-width:768px)').matches) return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY};handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointerup',event => {
      if (drag?.id !== event.pointerId) return;
      const dy=event.clientY-drag.y, dx=Math.abs(event.clientX-drag.x); drag=null;
      if (dy>58 && dy>dx*1.5) close.click();
    });
    handle.addEventListener('pointercancel',()=>{drag=null;});
  }
  if (document.querySelector('#page-header.full_page')) {
    const list=document.querySelector('#recent-posts .recent-post-items');
    if (list) {
      const cards=[...list.querySelectorAll('.recent-post-item')];
      const categories=cards.map(card=>card.querySelector('.article-meta__categories')?.textContent.trim() || '');
      const options=[...new Set(categories.filter(Boolean))];
      if (options.length) {
        const group=document.createElement('section'); group.className='journal-filters';
        const heading=document.createElement('h2');heading.textContent='文章';
        const tabs=document.createElement('div');tabs.className='journal-segments';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','筛选文章');
        const shortNames={'竞赛算法':'竞赛','比赛与工程':'工程','软件与工具':'工具','研究论文':'论文'};
        for (const name of ['',...options]) {
          const btn=document.createElement('button');btn.type='button';btn.dataset.category=name;btn.textContent=shortNames[name] || name || '全部';
          btn.addEventListener('click',()=>{
            const url=new URL(location.href);
            if(name) url.searchParams.set('category',name);else url.searchParams.delete('category');
            if(url.href!==location.href) history.pushState(history.state,'',url);
            apply();
          });tabs.append(btn);
        }
        function apply() {
          const query=new URL(location.href).searchParams.get('category');
          const active=options.includes(query)?query:'';
          cards.forEach((card,i)=>{card.hidden=Boolean(active && categories[i]!==active);});
          [...tabs.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===active)));
        }
        group.append(heading,tabs);list.before(group);apply();window.addEventListener('popstate',apply);
      }
    }
  }
  if (document.querySelector('#post #article-container')) {
    const progress=document.createElement('div');progress.className='journal-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
    let frame=0;
    const update=()=>{frame=0;const e=document.scrollingElement;
      progress.style.transform='scaleX('+Math.min(1,Math.max(0,e.scrollTop/Math.max(1,e.scrollHeight-e.clientHeight)))+')';};
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);update();
  }
})();
