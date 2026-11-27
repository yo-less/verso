/* Verso demo V19: time-driven motion, real UI, feature-specific compositions. */
const W=1920,H=1080,C={forest:"#102e20",paper:"#f8f1e5",rust:"#a23e2a",gold:"#b58a40",ivory:"#fff1dc",muted:"#a8bcaa"};
const ctx=document.querySelector("canvas").getContext("2d",{willReadFrequently:true});
const assets={},names=["import-library","hero-library","library-light","library-dark","book-light","highlights-light","stats","stats-detail","search","moby-cover","pride-cover","frankenstein-cover","year-mobile-intro","year-mobile-finished","year-mobile-authors","year-mobile-rhythm","year-mobile-summary","styled-sunset-light","styled-ocean","branding-viewport","mobile-home","login","login-background"];
names.push("import-empty","browse-typed","browse-results",...Array.from({length:12},(_,i)=>"browse-type-"+i),...Array.from({length:12},(_,i)=>"search-sharp-"+i),...Array.from({length:49},(_,i)=>"browse-scroll-"+i),...Array.from({length:61},(_,i)=>"detail-scroll-"+i),...Array.from({length:97},(_,i)=>"stats-scroll-"+i),"related-focus",...Array.from({length:5},(_,i)=>"branding-focus-"+i),"theme-light","theme-dark","theme-sunset","theme-ocean");
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},step=(t,a,b)=>ease((t-a)/(b-a)),mix=(a,b,p)=>a+(b-a)*p;
function load(k,src){return new Promise((ok,no)=>{let im=new Image;im.onload=()=>{assets[k]=im;ok()};im.onerror=()=>no(new Error("Missing asset "+src));im.src=src})}
window.ready=Promise.all(names.map(k=>load(k,"/captures/"+k+".png")).concat([
 load("landscape","/static/verso-login-landscape.webp"),load("logo","/static/verso-wordmark.svg"),
 load("logoDark","/static/verso-wordmark-dark.svg"),fetch("/captures/video-data.json").then(r=>r.json()).then(d=>window.data=d),
 document.fonts.load("600 90px Newsreader"),document.fonts.load("500 28px Geist")
]));
function rect(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function line(x,y,x2,y2,c,w=2){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function text(s,x,y,size,color=C.forest,font="Geist",weight=500,align="left"){ctx.font=weight+" "+size+"px "+font;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(s,x,y)}
function title(s,x=960,y=86,dark=true,size=76,align="center"){text(s,x,y,size,dark?C.ivory:C.forest,"Newsreader",600,align)}
function img(k,x,y,w,h,mode="contain"){const im=assets[k],s=(mode==="cover"?Math.max:Math.min)(w/im.width,h/im.height),dw=im.width*s,dh=im.height*s;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore()}
function fade(a,fn){ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore()}
function bg(dark=true,t=0){rect(0,0,W,H,0,dark?"#091d16":"#e9dcc7");let g=ctx.createRadialGradient(1050+Math.sin(t*.7)*240,260,80,960,440,1420);g.addColorStop(0,dark?"#365847":"#fff9eb");g.addColorStop(.55,dark?"#173a2b":"#f2e7d6");g.addColorStop(1,dark?"#081b13":"#d7c9b3");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function shadow(x,y,w,h,r,c,blur=48){ctx.save();ctx.shadowColor="#00000050";ctx.shadowBlur=blur;ctx.shadowOffsetY=22;rect(x,y,w,h,r,c);ctx.restore()}
function browser(k,x,y,w,zoom=1,focusX=.5,focusY=.5,withShadow=true,overlay=null){
 const im=assets[k],bar=w*.025,h=w*im.height/im.width,top=y+bar;
 if(withShadow)shadow(x,y,w,h+bar,19,C.paper);
 else rect(x,y,w,h+bar,19,C.paper);
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();
 rect(x,y,w,bar,0,"#213c30");
 ["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+bar*.45+i*bar*.52,y+bar*.36,bar*.24,bar*.24,bar*.12,c));
 ctx.beginPath();ctx.rect(x,top,w,h);ctx.clip();
 const sw=im.width/zoom,sh=im.height/zoom;
 ctx.drawImage(im,clamp(focusX)*(im.width-sw),clamp(focusY)*(im.height-sh),sw,sh,x,top,w,h);
 if(overlay)overlay(x,top,w,h);
 ctx.restore();
 return {x,y:top,w,h};
}
function reveal(t,a,b,fn,dy=26){let p=step(t,a,b);ctx.save();ctx.translate(0,(1-p)*dy);fade(p,fn);ctx.restore()}
const importStages=[
 {start:.65,end:1.85,label:"Importing file"},
 {start:1.85,end:2.68,label:"Converting to EPUB"},
 {start:2.68,end:3.45,label:"Adding metadata and cover"}
];
function importStage(t,x){
 const stage=importStages.find(({start,end})=>t>=start&&t<end);
 if(!stage)return;
 const {start,end,label}=stage;
 const opacity=step(t,start,start+.14)*(1-step(t,end-.14,end));
 fade(opacity,()=>text(label,x,479,32,C.forest,"Newsreader",600,"center"));
}
function brand(t,opening){
 if(opening){
  // Let the artwork establish itself before the wordmark arrives.
  rect(0,0,W,H,0,C.paper);
  const z=1.075-.075*step(t,0,3.5);
  fade(step(t,0,.85),()=>img("landscape",-(z-1)*W/2,-(z-1)*H/2,W*z,H*z,"cover"));
  const p=step(t,.65,1.75);ctx.save();ctx.translate(0,14*(1-p));
  fade(p,()=>img("logo",625,254,670,224));ctx.restore();
  fade(step(t,1.55,2.28),()=>text("Your personal library",960,550,46,C.forest,"Newsreader",500,"center"));
 }
}
function automation(t){
 bg(false,t);
 const center=step(t,5.05,5.85);
 fade(1-step(t,5.05,5.43),()=>title("From file to bookshelf",960,85,false,76));
 fade(step(t,5.43,5.85),()=>title("Fully automated import",960,85,false,76));
 const box=browser("import-empty",mix(720,310,center),mix(210,155,center),mix(1120,1300,center));
 const b=window.data.importCover,card=window.data.importCard,s=box.w/1440;
 const target={x:box.x+(b.x+b.width/2)*s,y:box.y+(b.y+b.height/2)*s,w:b.width*s,h:b.height*s};
 const dissolve=step(t,3.45,4.13),flight=step(t,3.45,5.35),land=step(t,5.35,5.60);
 const shelfArtwork=step(t,4.62,5.30);
 const im=assets["import-library"],ratio=im.width/1440;
 fade(land,()=>ctx.drawImage(im,card.x*ratio,card.y*ratio,card.width*ratio,card.height*ratio,box.x+card.x*s,box.y+card.y*s,card.width*s,card.height*s));
 const drop=step(t,.17,1.32),fx=460,fy=326;
 const converted=step(t,1.97,2.52),cover=step(t,2.75,3.25);
 const fold=Math.sin(Math.PI*converted);
 function folder(layer){
  fade(1-dissolve,()=>{
   ctx.translate(fx,fy+12*dissolve);
   ctx.scale(1-.08*dissolve,1-.18*dissolve);
   layer();
  });
 }
 folder(()=>{
  shadow(-146,-98,292,181,15,"#a47e42",18);
  rect(-146,-115,115,35,9,"#a47e42");
  rect(-132,-85,264,154,11,"#edd5a5");
 });
 // The sheet and its artwork share one transform and one silhouette.
 const x=mix(mix(145,fx,drop),target.x,flight);
 const y=mix(mix(274,fy-35-18*cover,drop)-75*Math.sin(Math.PI*drop),target.y,flight)-140*Math.sin(Math.PI*flight);
 const w=mix(mix(113,132,cover),target.w,flight),h=mix(mix(212,198,cover),target.h,flight);
 // Keep the cover opaque atop the card while its title and metadata appear.
 // Match the captured shelf artwork before landing so the cover stays put.
 ctx.save();
 ctx.translate(x,y);
 const rotation=mix(-Math.PI/2,-.045,cover)-.10*(1-drop);
 ctx.rotate(rotation*(1-flight));
 ctx.scale(1+.07*fold,1-.22*fold);
 ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,3*(1-flight));ctx.clip();
 rect(-w/2,-h/2,w,h,0,"#fffcf4");
 fade(1-cover,()=>{
  ctx.rotate(Math.PI/2);
  text("Moby-Dick",0,-34,23,C.forest,"Newsreader",600,"center");
  fade(1-converted,()=>rect(-43,-19,86,28,5,"#eddfc0"));
  fade(converted,()=>rect(-43,-19,86,28,5,C.forest));
  const epub=converted>=.5;
  fade(1-.75*fold,()=>text(epub?"EPUB":"MOBI",0,-5,19,epub?C.ivory:C.forest,"Geist",650,"center"));
  fade(fold,()=>{
   const crease=mix(-106,106,converted);
   const sheen=ctx.createLinearGradient(crease-20,0,crease+20,0);
   sheen.addColorStop(0,"#b58a4000");sheen.addColorStop(.5,"#b58a4066");sheen.addColorStop(1,"#b58a4000");
   rect(crease-20,-58,40,116,0,sheen);
  });
 });
 fade(cover,()=>{
  if(shelfArtwork<1)img("moby-cover",-w/2,-h/2,w,h,"cover");
  fade(shelfArtwork,()=>ctx.drawImage(im,b.x*ratio,b.y*ratio,b.width*ratio,b.height*ratio,-w/2,-h/2,w,h));
 });
 ctx.restore();
 folder(()=>{
  const front=ctx.createLinearGradient(0,-10,0,91);
  front.addColorStop(0,"#d6b479");front.addColorStop(1,"#bd9558");
  ctx.fillStyle=front;ctx.beginPath();ctx.moveTo(-154,-9);ctx.lineTo(154,-9);ctx.lineTo(137,80);ctx.quadraticCurveTo(135,91,123,91);ctx.lineTo(-123,91);ctx.quadraticCurveTo(-135,91,-137,80);ctx.closePath();ctx.fill();
  text("Watched import folder",0,-168,27,C.forest,"Newsreader",600,"center");
 });
 importStage(t,fx);
}
function footer(s,dark=true){
 // Captions have a dedicated safe area above player controls.
 text(s,960,970,32,dark?C.ivory:C.forest,"Geist",500,"center");
}
function library(t){
 bg(true,t);title("Browse your library",960,84,true,76);
 const w=1160,x=(W-w)/2,y=205;
 const a=step(t,1.55,1.85);
 fade(1-a,()=>text("Explore the shelves",960,151,31,C.ivory,"Geist",500,"center"));
 fade(a,()=>text("Search by author",960,151,31,C.ivory,"Geist",500,"center"));
 if(t<1.72){
  browser("browse-scroll-"+Math.round(clamp((t-.12)/1.60)*48),x,y,w);
 }else if(t<4.55){
  const n=Math.min(11,Math.floor(clamp((t-2.15)/1.55)*12)),k="browse-type-"+n;
  browser(k,x,y,w);
  const b=window.data.searchBox,p=step(t,1.72,2.12)*(1-step(t,4.13,4.55)),im=assets["search-sharp-"+n];
  const scale=w/1440,ww=mix(b.width*scale,Math.min(1000,im.width),p),hh=ww*im.height/im.width;
  const cx=mix(x+(b.x+b.width/2)*scale,960,p),cy=mix(y+w*.025+(b.y+b.height/2)*scale,355,p);
  fade(p,()=>{shadow(cx-ww/2-9,cy-hh/2-9,ww+18,hh+18,16,C.paper,25);
   ctx.drawImage(im,cx-ww/2,cy-hh/2,ww,hh);
  });
 }else if(t<5.19){
  browser("browse-type-11",x,y,w,1,.5,.5,true,(bx,by,bw,bh)=>{
   const im=assets["browse-results"],b=window.data.resultsBox,s=bw/im.width;
   const left=bx+b.x*s,top=by+b.y*s,width=bw-b.x*s,height=bh-b.y*s;
   fade(step(t,4.55,4.80),()=>rect(left,top,width,height,0,C.paper));
   fade(step(t,4.78,5.17),()=>ctx.drawImage(im,b.x,b.y,im.width-b.x,im.height-b.y,left,top,width,height));
  });
 }else browser("browse-results",x,y,w);
 // Explanation lives with the title; the area below the window stays clear.
}
const detailBrowser={x:350,y:155,w:1220};
const detailsHold=4.90;
function detailPlate(frame,x,y,w){
 // Reuse one pixel-exact sidebar from the real final viewport throughout
 // the detail scroll and inset. The surrounding UI never reflows.
 return browser("detail-scroll-"+frame,x,y,w,1,.5,.5,true,(bx,by,bw)=>{
  const b=window.data.detailSidebar,im=assets["detail-scroll-60"],s=bw/im.width;
  ctx.drawImage(im,b.x,b.y,b.width,b.height,bx+b.x*s,by+b.y*s,b.width*s,b.height*s);
 });
}
function details(t){
 bg(false,Math.min(t,detailsHold));
 const heading=step(t,1.25,1.72),p=step(t,2.85,3.48);
 fade(1-heading,()=>title("Explore a book",960,84,false,76));
 fade(heading,()=>title("Discover related titles",960,84,false,76));
 const i=Math.round(clamp((t-.85)/2.0)*60);
 const box=detailPlate(i,detailBrowser.x,detailBrowser.y,detailBrowser.w);
 relatedInset(box,p);
}
function relatedInset(box,p){
 if(p===0)return;
 const b=window.data.relatedFocus,im=assets["related-focus"],s=box.w/assets["detail-scroll-60"].width;
 const sidebar=window.data.detailSidebar,edge=box.x+(sidebar.x+sidebar.width)*s;
 // Neither the crop nor its expanding shadow may touch the navigation.
 ctx.save();ctx.beginPath();ctx.rect(edge,0,W-edge,H);ctx.clip();
 const scale=Math.min(1030/b.width,475/b.height,1.65),pad=24*p;
 const w=b.width*mix(s,scale,p),h=b.height*mix(s,scale,p);
 const x=mix(box.x+b.x*s,1786-b.width*scale,p);
 const y=mix(box.y+b.y*s,Math.min(464,866-b.height*scale),p);
 fade(p,()=>shadow(x-pad,y-pad,w+2*pad,h+2*pad,18*p,C.paper,34*p));
 const scaleBlend=step(p,0,.4);
 const source=assets["detail-scroll-60"];
 ctx.drawImage(source,b.x,b.y,b.width,b.height,x,y,w,h);
 fade(scaleBlend,()=>ctx.drawImage(im,x,y,w,h));
 ctx.restore();
}
const syncHandoff=1.55;
function devices(handoff){
 const move=step(handoff,0,.88),t=handoff-syncHandoff;
 // The capture strip is already eased. Run it backward within the same
 // browser to return to the book's reading progress.
 const frame=60-Math.round(60*clamp((handoff-.54)/.83));
 bg(false,detailsHold);
 fade(move,()=>bg(true,Math.max(0,t)));
 fade(1-step(handoff,0,.38),()=>title("Discover related titles",960,84,false,76));
 fade(step(t,0,.44),()=>title("Pick up where you left off",960,85,true,76));
 const box=detailPlate(frame,mix(detailBrowser.x,96,move),
  mix(detailBrowser.y,180,move),mix(detailBrowser.w,1090,move));
 const a=step(t,3.66,4.25),b=step(t,1.45,1.98),progress=38+9*b,synced=38+9*a;
 const device=step(t,.68,1.27);
 fade(device,()=>{
  ctx.translate(92*(1-device),22*(1-device));
  ctx.translate(1585,535);ctx.scale(.96+.04*device,.96+.04*device);ctx.translate(-1585,-535);
  shadow(1395,180,380,715,38,"#202722");rect(1418,203,334,640,14,"#ecebe1");
  text("My books",1441,238,25,C.forest,"Geist",600);
  [["Moby-Dick","moby-cover",progress],["Pride and Prejudice","pride-cover",64],["Frankenstein","frankenstein-cover",21]].forEach(([s,k,v],i)=>{
   const y=300+i*163;ctx.save();ctx.filter="grayscale(1)";img(k,1437,y,73,110);ctx.restore();
   text(s,1523,y+20,17,C.forest,"Newsreader",600);
   line(1523,y+66,1728,y+66,"#b2b6aa",5);line(1523,y+66,1523+205*v/100,y+66,C.forest,5);text(Math.round(v)+"%",1523,y+89,18,C.forest);
  });
  const opened=step(t,2.0,2.48);
  fade(opened,()=>{
   rect(1418,203,334,640,14,"#ecebe1");
   text("Moby-Dick",1585,245,25,C.forest,"Newsreader",600,"center");
   line(1440,274,1730,274,"#a1a59a",1);
   text("The Whiteness of the Whale",1585,317,20,C.forest,"Newsreader",600,"center");
   const excerpt=["It was the whiteness of","the whale that above all","things appalled me. But","how can I hope to explain","myself here; and yet, in","some dim, random way,","explain myself I must,","else all these chapters","might be naught."];
   excerpt.forEach((s,i)=>text(s,1445,365+i*36,24,C.forest,"Newsreader",500));
   line(1445,786,1725,786,"#b2b6aa",3);
   line(1445,786,1445+280*progress/100,786,C.forest,3);
   text(Math.round(progress)+"%",1585,815,17,C.forest,"Geist",500,"center");
  });
  rect(1520,865,130,6,3,"#6a7469");
  text("KOReader  ·  Kobo",1585,932,29,C.ivory,"Geist",550,"center");text("Illustrated device",1585,970,21,C.muted,"Geist",450,"center");
 });
 relatedInset(box,1-step(handoff,0,.54));
 fade(step(t,2.75,3.04),()=>{
  const spin=step(t,3.12,3.65),x=1290,y=520;
  rect(x-42,y-42,84,84,42,C.gold);
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*2*spin);
  ctx.fillStyle=C.forest;
  // Each curved shaft and its triangular tip share a single filled outline.
  for(const start of [-Math.PI+.50,.50]){
   const end=start+Math.PI-1,R=22,ex=R*Math.cos(end),ey=R*Math.sin(end);
   const tx=-Math.sin(end),ty=Math.cos(end),nx=-ty,ny=tx;
   ctx.beginPath();ctx.arc(0,0,R+2.6,start,end);
   ctx.lineTo(ex-8*nx,ey-8*ny);ctx.lineTo(ex+12*tx,ey+12*ty);
   ctx.lineTo(ex+8*nx,ey+8*ny);ctx.lineTo(ex+2.6*nx,ey+2.6*ny);
   ctx.arc(0,0,R-2.6,end,start,true);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 });
 // Conceptual progress indicator, explicitly distinct from the captured UI.
 fade(step(t,2.48,2.73),()=>{
  rect(96,875,1090,86,14,"#274739");text("Moby-Dick  ·  Reading progress",125,901,26,C.ivory,"Geist",550);line(125,936,950,936,"#637a6c",6);line(125,936,125+825*synced/100,936,C.gold,6);text(Math.round(synced)+"%",1100,936,32,C.ivory,"Geist",600,"right");
 });
 fade(step(t,4.25,4.57),()=>text("Progress synchronized",640,990,25,C.muted,"Geist",500,"center"));
}
function statistics(t){
 bg(false,t);title("Your reading, in perspective",960,85,false,74);
 const i=Math.round(clamp((t-1.15)/3.2)*96);
 browser("stats-scroll-"+i,350,155,1220);
}
const statisticsEnd=5.4;
const highlightsHandoff=.65;
function highlights(handoff){
 const t=handoff-highlightsHandoff;
 bg(false,statisticsEnd-.001);
 fade(step(handoff,0,.6),()=>bg(true,Math.max(0,t)));
 fade(1-step(handoff,0,.32),()=>title("Your reading, in perspective",960,85,false,74));
 fade(step(handoff,.32,.78),()=>title("Keep the words that matter",960,85,true,76));
 const swapping=handoff>=.28;
 const veil=step(handoff,0,.28)*(1-step(handoff,.28,highlightsHandoff));
 browser(swapping?"highlights-light":"stats-scroll-96",350,155,1220,1,.5,.5,true,(x,y,w,h)=>{
  if(veil===0)return;
  const b=window.data.statsContent,scale=w/1440;
  const left=b.x*scale,top=b.y*scale;
  fade(veil,()=>rect(x+left,y+top,w-left,h-top,0,C.paper));
 });
 let p=step(t,.4,1.0);ctx.save();ctx.translate(1045+(1-p)*65,365+(1-p)*25);
 fade(p,()=>{
  shadow(0,0,770,465,15,C.paper,30);text("“",48,88,105,C.rust,"Newsreader",600);
  const quote=[["I am no bird; and no net",192,.85,1.55],["ensnares me.",262,1.55,2.12]];
  for(const [s,y,a,b] of quote){
   ctx.font="550 55px Newsreader";
   const width=ctx.measureText(s).width+13;
   rect(42,y-34,width*step(t,a,b),68,3,"#ead69e");
   text(s,49,y,55,C.forest,"Newsreader",550);
  }
  text("Charlotte Brontë · Jane Eyre",50,370,26,C.rust,"Geist",500);
 });ctx.restore();
}
function yearPhone(key,cx,cy,w){
 const im=assets[key],bezel=12,screen=w-2*bezel,height=screen*im.height/im.width;
 const x=cx-w/2,y=cy-height/2-bezel;
 shadow(x,y,w,height+2*bezel,36,"#0d1712",32);
 ctx.save();
 ctx.beginPath();ctx.roundRect(x+bezel,y+bezel,screen,height,26);ctx.clip();
 ctx.drawImage(im,x+bezel,y+bezel,screen,height);
 ctx.restore();
}
function year(t){
 bg(true,t);title("Your year in books",960,79,true,78);
 const slides=["intro","finished","authors","rhythm","summary"];
 let pos=0;
 for(let i=1;i<slides.length;i++)pos+=step(t,1.48*i-.28,1.48*i+.48);
 const phones=slides.map((key,i)=>({key,delta:i-pos})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 for(const {key,delta} of phones){
  if(Math.abs(delta)>2.5)continue;
  const strength=1-clamp(Math.abs(delta)/1.6);
  fade(mix(.43,1,strength),()=>yearPhone("year-mobile-"+key,960+delta*450,565+(1-strength)*30,mix(300,398,strength)));
 }
 slides.forEach((_,i)=>rect(885+i*32,984,22,5,2,Math.abs(i-pos)<.5?C.gold:C.muted));
}
function personalize(t){
 bg(false,t);title("Make it yours",960,85,false,82);
 const seq=["theme-light","theme-dark","theme-sunset","theme-ocean","branding-viewport"];
 const labels=["Light","Dark","Sunset","Ocean","Instance branding"];
 const starts=[0,1.15,2.30,3.45,4.75];
 const i=Math.max(0,starts.filter(s=>t>=s).length-1),q=t-starts[i],x=380,y=150,w=1160;
 ctx.save();ctx.beginPath();ctx.rect(350,130,1220,790);ctx.clip();
 const p=i===0?1:step(q,0,.48);
 if(i>0&&p<1)browser(seq[i-1],x-1220*p,y,w,1,.5,.5,false);
 browser(seq[i],x+1220*(1-p),y,w,1,.5,.5,false);
 ctx.restore();
 rect(630,936,660,58,29,C.forest);text(labels[i],960,965,29,C.ivory,"Geist",550,"center");
 if(i<4)return;
 // One last slide: the real admin page stays put while its actual
 // controls are lifted into a readable foreground inset.
 const label=["Site name","Your own logo","Custom colours","Custom favicon","Login artwork"];
 const f=Math.max(0,q-.55),idx=Math.min(4,Math.floor(f/1.55)),local=f-idx*1.55;
 const appear=step(q,.55,.90);
 function inset(j,alpha,offset){
  const im=assets["branding-focus-"+j],boxes=window.data.brandingFocus[j],ratio=im.width/1440;
  const left=Math.max(0,Math.min(...boxes.map(b=>b.x))-12);
  const top=Math.max(0,Math.min(...boxes.map(b=>b.y))-10);
  const right=Math.min(1440,Math.max(...boxes.map(b=>b.x+b.width))+12);
  const bottom=Math.min(900,Math.max(...boxes.map(b=>b.y+b.height))+10);
  const sw=right-left,sh=bottom-top,scale=Math.min(850/sw,325/sh,1.20);
  const iw=sw*scale,ih=sh*scale,pad=30,ww=Math.max(720,iw+pad*2),hh=ih+125;
  const xx=1810-ww,yy=480-hh/2+offset;
  fade(alpha,()=>{
   shadow(xx,yy,ww,hh,18,C.paper,32);
   text(label[j],xx+pad,yy+42,42,C.forest,"Newsreader",600);
   line(xx+pad,yy+75,xx+ww-pad,yy+75,"#c8b994",2);
   ctx.save();ctx.beginPath();ctx.roundRect(xx+pad,yy+88,iw,ih,7);ctx.clip();
   ctx.drawImage(im,left*ratio,top*ratio,sw*ratio,sh*ratio,xx+pad,yy+88,iw,ih);ctx.restore();
  });
 }
 const blend=idx===0?1:step(local,0,.3);
 if(idx>0&&blend<1)inset(idx-1,appear*(1-blend),-12*blend);
 inset(idx,appear*blend,22*(1-appear)+12*(1-blend));
}
function installBrowser(t,ending=0){
 const x=365,y=150,w=1190,bar=78,h=w*assets.login.height/assets.login.width;
 shadow(x,y,w,h+bar,19,C.paper,32);
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();
 rect(x,y,w,bar,0,"#213c30");
 ["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+19+i*24,y+15,12,12,6,c));
 rect(x+110,y+14,w-134,49,12,C.paper);
 const url="http://localhost:8083",n=Math.min(url.length,Math.floor(clamp((t-3.04)/1.02)*(url.length+1)));
 text(url.slice(0,n),x+132,y+39,27,C.forest,"Geist",500);
 if(n<url.length)line(x+132+ctx.measureText(url.slice(0,n)).width,y+25,x+132+ctx.measureText(url.slice(0,n)).width,y+53,C.forest,2);
 rect(x,y+bar,w,h,0,C.paper);
 fade(step(t,4.20,4.55),()=>img("login",x,y+bar,w,h,"cover"));
 // Closing typography and landscape replace the login form within
 // the same browser viewport. No new shell or full-screen wipe.
 fade(ending,()=>{
  img("login-background",x,y+bar,w,h,"cover");
  img("logo",x+w/2-255,y+bar+h*.20,510,170);
  text("Self-hosted  ·  Open source",x+w/2,y+bar+h*.47,38,C.forest,"Newsreader",550,"center");
  text("github.com/yo-less/verso",x+w/2,y+bar+h*.54,32,C.forest,"Newsreader",500,"center");
 });
 ctx.restore();
}
function install(t){
 bg(true,t);title("Run Verso yourself",960,105,true,76);
 const p=step(t,2.65,3.10);
 fade(1-p,()=>{
  shadow(230,250,1460,610,22,"#0b1913");rect(230,250,1460,61,21,"#2a4838");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(259+i*30,272,16,16,8,c));text("Terminal",960,280,28,C.ivory,"Geist",500,"center");
  let lines=["$ git clone https://github.com/yo-less/verso.git verso","$ cd verso","$ docker compose up -d"];
  lines.forEach((s,i)=>{let a=clamp((t-.12-i*.72)/.52);text(s.slice(0,Math.ceil(s.length*a)),280,405+i*106,37,C.ivory,"monospace",500)});
 });
 fade(p,()=>installBrowser(t));
}
function close(t){
 const p=step(t,.05,.55);
 bg(true,6.25);fade(1-p,()=>title("Run Verso yourself",960,105,true,76));
 installBrowser(6.25,p);
}
const scenes=[
 {id:"intro",len:3.5,draw:t=>brand(t,true)},
 {id:"automation",len:7.1,draw:automation,review:[.26,.8,1.5,2.2,2.55,3.15,4.4,5.30,5.45,5.60,6.05,6.95]},
 {id:"library",len:5.8,draw:library,review:[1.6,2.5,3.6,4.55,4.85,5.3]},
 {id:"details",len:5.0,draw:details,review:[.4,1.2,2,2.85,3.15,3.48,4.98]},
 {id:"devices",len:5.35+syncHandoff,draw:devices,entry:"continuous",review:[0,1.42,2.08,2.95,3.42,4.13,4.65,5.85,6.75]},
 {id:"statistics",len:statisticsEnd,draw:statistics,review:[.8,1.7,2.8,4,5.39]},
 {id:"highlights",len:3+highlightsHandoff,draw:highlights,entry:"continuous",review:[0,.32,.78,1.65,2.8]},
 {id:"year",len:8,draw:year,review:[.75,1.9,2.75,4.35,5.25,7.7]},
 {id:"personalize",len:13.1,draw:personalize,review:[4.5,5.7,7.2,8.75,10.3,11.85,12.8]},
 {id:"install",len:6.25,draw:install,review:[3.6,4.8,5.8]},
 {id:"close",len:3.8,draw:close,entry:"continuous",review:[0,.25,.55,.85,3.3]}
];
window.timeline=scenes.map(({id,len,review=[]})=>({id,seconds:len,review}));
window.duration=scenes.reduce((n,s)=>n+s.len,0);
function drawScene(i,t){ctx.save();scenes[i].draw(Math.max(0,t));ctx.restore()}
window.render=function(time){
 let t=Math.max(0,Math.min(window.duration-.001,time)),i=0;
 while(t>=scenes[i].len)t-=scenes[i++].len;
 drawScene(i,t);
 const entry=scenes[i].entry??"dissolve";
 if(i===0||entry==="continuous")return;
 const previous=()=>drawScene(i-1,scenes[i-1].len-.001);
 if(entry==="wipe"&&t<.65){
  const p=step(t,0,.65);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W*(1-p),H);ctx.clip();previous();ctx.restore();
 }else if(entry==="dissolve"&&t<.52){
  fade(1-step(t,0,.52),previous);
 }
};

window.verifyDetailSidebar=function(){
 const b=window.data.detailSidebar,s=detailBrowser.w/assets["detail-scroll-60"].width;
 const x=Math.ceil(detailBrowser.x+b.x*s)+3;
 const y=Math.ceil(detailBrowser.y+detailBrowser.w*.025+b.y*s)+3;
 const w=Math.floor(b.width*s)-6,h=Math.floor(b.height*s)-6;
 ctx.save();details(2.85);ctx.restore();
 const before=ctx.getImageData(x,y,w,h).data;
 ctx.save();details(3.48);ctx.restore();
 const after=ctx.getImageData(x,y,w,h).data;
 let changed=0;
 for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]||before[i+3]!==after[i+3])changed++;
 return {width:w,height:h,changed,ok:changed===0};
};
