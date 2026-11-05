document.addEventListener("DOMContentLoaded",()=>{
  const button=document.querySelector(".menu-toggle");
  const panel=document.getElementById("site-menu");
  if(!button||!panel)return;
  let closeTimer;
  const setOpen=open=>{
    clearTimeout(closeTimer);
    button.setAttribute("aria-expanded",String(open));
    button.setAttribute("aria-label",open?"Close menu":"Open menu");
    button.classList.toggle("is-open",open);
    if(open){
      panel.hidden=false;
      requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.add("is-open")));
    }else{
      panel.classList.remove("is-open");
      closeTimer=setTimeout(()=>{panel.hidden=true},220);
    }
  };
  button.addEventListener("click",()=>setOpen(button.getAttribute("aria-expanded")!=="true"));
  document.addEventListener("click",event=>{
    if(!event.target.closest(".menu-wrap"))setOpen(false);
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&button.getAttribute("aria-expanded")==="true"){
      setOpen(false);button.focus();
    }
  });
  panel.addEventListener("click",event=>{
    if(event.target.closest("a"))setOpen(false);
  });
});