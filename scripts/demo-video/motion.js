/* Verso demo V9: time-driven motion, real UI, feature-specific compositions. */
const W=1920,H=1080,C={forest:"#102e20",paper:"#f8f1e5",rust:"#a23e2a",gold:"#b58a40",ivory:"#fff1dc",muted:"#a8bcaa"};
const ctx=document.querySelector("canvas").getContext("2d",{willReadFrequently:true});
const assets={},names=["import-library","hero-library","library-light","library-dark","book-light","highlights-light","stats","stats-detail","search","related","moby-cover","pride-cover","frankenstein-cover","story-intro","story-finished","story-authors","story-rhythm","story-summary","styled-sunset-light","styled-ocean","branding-viewport","mobile-home","login"];
names.push("import-empty","browse-typed","browse-results",...Array.from({length:12},(_,i)=>"browse-type-"+i),...Array.from({length:12},(_,i)=>"search-sharp-"+i),...Array.from({length:49},(_,i)=>"browse-scroll-"+i),...Array.from({length:85},(_,i)=>"detail-scroll-"+i),...Array.from({length:5},(_,i)=>"branding-focus-"+i),"theme-light","theme-dark","theme-sunset","theme-ocean");
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
function browser(k,x,y,w,zoom=1,focusX=.5,focusY=.5,withShadow=true){let im=assets[k],bar=w*.025,h=w*im.height/im.width;if(withShadow)shadow(x,y,w,h+bar,19,C.paper);else rect(x,y,w,h+bar,19,C.paper);ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();rect(x,y,w,bar,0,"#213c30");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+bar*.45+i*bar*.52,y+bar*.36,bar*.24,bar*.24,bar*.12,c));ctx.save();ctx.beginPath();ctx.rect(x,y+bar,w,h);ctx.clip();let sw=im.width/zoom,sh=im.height/zoom;ctx.drawImage(im,clamp(focusX)*(im.width-sw),clamp(focusY)*(im.height-sh),sw,sh,x,y+bar,w,h);ctx.restore();ctx.restore();return {x,y:y+bar,w,h}}
function phone(k,cx,cy,w,angle=0){let im=assets[k],bezel=12,iw=w-2*bezel,ih=iw*im.height/im.width,h=ih+2*bezel;ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);shadow(-w/2,-h/2,w,h,38,"#0d1410",32);ctx.strokeStyle="#818b80";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,38);ctx.stroke();ctx.save();ctx.beginPath();ctx.roundRect(-iw/2,-ih/2,iw,ih,26);ctx.clip();img(k,-iw/2,-ih/2,iw,ih);ctx.restore();ctx.restore()}
function reveal(t,a,b,fn,dy=26){let p=step(t,a,b);ctx.save();ctx.translate(0,(1-p)*dy);fade(p,fn);ctx.restore()}
const tickRows=[{y:428,start:1.35,label:"Import"},{y:522,start:2.05,label:"Convert if needed"},{y:616,start:2.75,label:"Metadata & cover"},{y:710,start:3.45,label:"Organize"}];
function tick(cx,cy,p){rect(cx-24,cy-24,48,48,24,C.gold);ctx.save();ctx.strokeStyle=C.forest;ctx.lineWidth=5;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(cx-11,cy);let a=clamp(p*2),b=clamp(p*2-1);ctx.lineTo(cx-11+8*a,cy+8*a);if(b>0)ctx.lineTo(cx-3+15*b,cy+8-19*b);if(p>0)ctx.stroke();ctx.restore()}
function brand(t,opening){
 if(opening){
  // Let the artwork establish itself before the wordmark arrives.
  rect(0,0,W,H,0,C.paper);
  const z=1.075-.075*step(t,0,3.5);
  fade(step(t,0,.85),()=>img("landscape",-(z-1)*W/2,-(z-1)*H/2,W*z,H*z,"cover"));
  const p=step(t,.65,1.75);ctx.save();ctx.translate(0,14*(1-p));
  fade(p,()=>img("logo",625,254,670,224));ctx.restore();
  fade(step(t,1.55,2.28),()=>text("Your personal library",960,550,46,C.forest,"Newsreader",500,"center"));
 }else{
  const z=1+.018*step(t,0,2.5);img("landscape",-(z-1)*W/2,-(z-1)*H/2,W*z,H*z,"cover");
  img("logo",625,220,670,224);
  text("Self-hosted  ·  Open source",960,526,42,C.forest,"Newsreader",550,"center");
  text("github.com/yo-less/verso",960,588,36,C.forest,"Newsreader",500,"center");
 }
}
function automation(t){
 bg(false,t);title("From file to bookshelf",90,110,false,76,"left");
 const box=browser("import-empty",770,220,1050),b=window.data.importCover,card=window.data.importCard,s=box.w/1440;
 const target={x:box.x+(b.x+b.width/2)*s,y:box.y+(b.y+b.height/2)*s,w:b.width*s,h:b.height*s};
 const flight=step(t,3.60,5.25),land=step(t,5.25,5.52);
 const im=assets["import-library"],ratio=im.width/1440;
 fade(land,()=>ctx.drawImage(im,card.x*ratio,card.y*ratio,card.width*ratio,card.height*ratio,box.x+card.x*s,box.y+card.y*s,card.width*s,card.height*s));
 // A watched ingest folder, with a file visibly dropped into it.
 const drop=step(t,.22,1.18),fx=510,fy=270;
 rect(fx-103,fy-43,88,27,8,"#b58a40");
 rect(fx-103,fy-25,206,102,10,"#b58a40");
 fade(1-step(t,1.00,1.30),()=>{
  const x=mix(195,fx,drop),y=mix(282,fy+35,drop)-72*Math.sin(Math.PI*drop);
  shadow(x-40,y-53,80,106,6,C.paper,8);
  text("EPUB",x,y-5,21,C.rust,"Geist",700,"center");
  line(x-24,y+23,x+24,y+23,C.gold,3);
 });
 rect(fx-108,fy+4,216,77,9,"#d0aa65");
 text("Watched import folder",fx,fy+110,24,C.forest,"Geist",500,"center");
 fade(1-step(t,.65,1.15),()=>text("Moby-Dick.epub",195,365,21,C.forest,"Geist",500,"center"));
 fade(step(t,1.18,1.5)*(1-step(t,3.15,3.55)),()=>{rect(fx+75,fy-45,26,26,13,C.forest);text("↓",fx+88,fy-32,19,C.ivory,"Geist",600,"center")});
 tickRows.forEach(row=>{let p=step(t,row.start,row.start+.38);tick(120,row.y,p);text(row.label,167,row.y,36,C.forest,"Geist",500)});
 const x=mix(fx,target.x,flight),y=mix(fy-14,target.y,flight)-85*Math.sin(Math.PI*flight);
 const w=mix(116,target.w,flight),h=mix(166,target.h,flight);
 // Only cover pixels are drawn during flight; no window or EPUB shell.
 fade(step(t,3.2,3.55)*(1-land),()=>{ctx.save();ctx.translate(x,y);ctx.rotate(-.045*(1-flight));img("moby-cover",-w/2,-h/2,w,h,"cover");ctx.restore()});
 text("Illustrated import sequence",95,973,23,"#6b6f60");
}
function footer(s,dark=true){
 // Captions have a dedicated safe area above player controls.
 text(s,960,970,32,dark?C.ivory:C.forest,"Geist",500,"center");
}
function library(t){
 bg(true,t);title("Browse your library",960,84,true,76);
 const w=1160,x=(W-w)/2,y=150;
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
 }else browser("browse-results",x,y,w);
 footer(t<1.72?"Explore the shelves":t<4.55?"Search by author":"Jane Austen · matching books");
}
function details(t){
 bg(false,t);
 const p=step(t,1.15,1.55);
 fade(1-p,()=>title("Explore a book",960,84,false,76));
 fade(p,()=>title("Discover related titles",960,84,false,76));
 // One sampled real browser position per 30fps output frame.
 const i=Math.min(84,Math.round(clamp((t-.55)/2.8)*84));
 browser("detail-scroll-"+i,350,155,1220);
}
function devices(t){
 bg(true,t);title("Pick up where you left off",960,85,true,76);
 browser("book-light",96,180,1090);
 shadow(1395,180,380,715,38,"#202722");rect(1418,203,334,640,14,"#ecebe1");
 text("My books",1441,238,25,C.forest,"Geist",600);
 const a=step(t,.35,1.05),b=step(t,1.55,2.2),progress=38+9*b,synced=38+9*a;
 [["Moby-Dick","moby-cover",progress],["Pride and Prejudice","pride-cover",64],["Frankenstein","frankenstein-cover",21]].forEach(([s,k,v],i)=>{
  const y=300+i*163;ctx.save();ctx.filter="grayscale(1)";img(k,1437,y,73,110);ctx.restore();
  text(s,1523,y+20,17,C.forest,"Newsreader",600);
  line(1523,y+66,1728,y+66,"#b2b6aa",5);line(1523,y+66,1523+205*v/100,y+66,C.forest,5);text(Math.round(v)+"%",1523,y+89,18,C.forest);
 });
 const opened=step(t,2.35,2.72);
 fade(opened,()=>{
  rect(1418,203,334,640,14,"#ecebe1");
  text("Moby-Dick",1585,245,25,C.forest,"Newsreader",600,"center");
  line(1440,274,1730,274,"#a1a59a",1);
  text("The Whiteness of the Whale",1585,317,20,C.forest,"Newsreader",600,"center");
  const excerpt=["It was the whiteness of","the whale that above all","things appalled me. But","how can I hope to explain","myself here; and yet, in","some dim, random way,","explain myself I must,","else all these chapters","might be naught."];
  excerpt.forEach((s,i)=>text(s,1445,365+i*36,24,C.forest,"Newsreader",500));
  line(1445,786,1725,786,"#b2b6aa",3);
  line(1445,786,1445+280*synced/100,786,C.forest,3);
  text(Math.round(synced)+"%",1585,815,17,C.forest,"Geist",500,"center");
 });
 rect(1520,865,130,6,3,"#6a7469");
 const spin=step(t,1.05,1.55),x=1290,y=520;
 rect(x-42,y-42,84,84,42,C.gold);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*2*spin);ctx.strokeStyle=C.forest;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,22,-2.7,.1);ctx.stroke();ctx.beginPath();ctx.arc(0,0,22,.45,3.25);ctx.stroke();line(22,2,14,-7,C.forest,5);line(22,2,29,-8,C.forest,5);line(-22,-2,-14,7,C.forest,5);line(-22,-2,-29,8,C.forest,5);ctx.restore();
 // Conceptual progress indicator, explicitly distinct from the captured UI.
 rect(96,875,1090,86,14,"#274739");text("Moby-Dick  ·  Reading progress",125,901,26,C.ivory,"Geist",550);line(125,936,950,936,"#637a6c",6);line(125,936,125+825*synced/100,936,C.gold,6);text(Math.round(synced)+"%",1100,936,32,C.ivory,"Geist",600,"right");
 text(b>.99?"Progress synchronized":"Verso  ·  Illustrated sync",640,990,25,C.muted,"Geist",500,"center");
 text("Kobo  ·  KOReader",1585,932,29,C.ivory,"Geist",550,"center");text("Illustrated device",1585,970,21,C.muted,"Geist",450,"center");
}
function statistics(t){
 bg(false,t);title("Your reading, in perspective",960,85,false,74);
 browser("stats",350,155,1220);
 fade(step(t,1.3,1.85),()=>browser("stats-detail",350,155,1220));
}
function highlights(t){
 bg(true,t);title("Keep the words that matter",960,85,true,76);
 // Keep the browser in the same position as the preceding statistics scene.
 browser("highlights-light",350,155,1220);
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
function year(t){
 bg(true,t);title("Your year in books",960,79,true,78);
 // A moving story carousel, not three independent stationary devices.
 const seq=["story-intro","story-finished","story-authors","story-rhythm","story-summary"];
 let pos=0;
 for(let i=1;i<seq.length;i++)pos+=step(t,i*1.22-.42,i*1.22+.28);
 const cards=seq.map((k,i)=>({k,i,delta:i-pos})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 for(const {k,delta} of cards){
  if(Math.abs(delta)>2.5)continue;
  const strength=1-clamp(Math.abs(delta)/1.6),w=mix(300,398,strength),x=960+delta*450,y=570+(1-strength)*30;
  fade(mix(.46,1,strength),()=>phone(k,x,y,w,0));
 }
 seq.forEach((_,i)=>rect(960-64+i*32,980,22,5,2,Math.abs(i-pos)<.5?C.gold:"#718579"));
}
function personalize(t){
 bg(false,t);title("Make it yours",960,85,false,82);
 const seq=["theme-light","theme-dark","theme-sunset","theme-ocean"];
 const labels=["Light","Dark","Sunset","Ocean"];
 const starts=[0,1.15,2.30,3.45];
 const i=Math.max(0,starts.filter(s=>t>=s).length-1),q=t-starts[i],x=380,y=150,w=1160;
 ctx.save();ctx.beginPath();ctx.rect(350,130,1220,790);ctx.clip();
 const p=i===0?1:step(q,0,.48);
 if(i>0&&p<1)browser(seq[i-1],x-1220*p,y,w,1,.5,.5,false);
 browser(seq[i],x+1220*(1-p),y,w,1,.5,.5,false);
 ctx.restore();
 rect(630,936,660,58,29,C.forest);text(labels[i],960,965,29,C.ivory,"Geist",550,"center");
}
function branding(t){
 bg(false,t);title("Give your library its own identity",960,85,false,72);
 const labels=["Custom library name","Your own logo","Custom colours","Custom favicon","Login artwork"];
 const descriptions=["Choose the name of your instance","Upload a navigation wordmark","Set background and accent colours","Use your own browser icon","Customize the login wordmark"];
 const i=Math.min(4,Math.floor(t/1.55)),q=t-i*1.55;
 const x=585,y=160,w=1245,scale=w/1440;
 const p=i===0?1:step(q,0,.22);
 const draw=(j,alpha)=>fade(alpha,()=>{
  const box=browser("branding-focus-"+j,x,y,w,1,.5,.5,false);
  const strength=step(j===i?q:1,0,.20);
  window.data.brandingFocus[j].forEach(b=>{
   const pad=6,xx=box.x+b.x*scale-pad,yy=box.y+b.y*scale-pad,ww=b.width*scale+2*pad,hh=b.height*scale+2*pad;
   ctx.save();ctx.globalAlpha*=strength;ctx.strokeStyle=C.rust;ctx.lineWidth=3;
   ctx.beginPath();ctx.roundRect(xx,yy,ww,hh,8);ctx.stroke();ctx.restore();
  });
 });
 if(i>0&&p<1)draw(i-1,1);
 draw(i,p);
 labels.forEach((s,j)=>{
  const a=j<i?0.7:j===i?1:0;
  fade(a,()=>{rect(90,280+j*108,12,12,6,j===i?C.rust:C.gold);text(s,116,285+j*108,31,C.forest,"Geist",j===i?650:500)});
 });
 reveal(q,.14,.46,()=>text(descriptions[i],90,855,25,C.rust,"Newsreader",550),10);
}
function install(t){
 bg(true,t);title("Run Verso yourself",960,105,true,76);
 const p=step(t,2.65,3.10);
 fade(1-p,()=>{
  shadow(230,250,1460,610,22,"#0b1913");rect(230,250,1460,61,21,"#2a4838");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(259+i*30,272,16,16,8,c));text("Terminal",960,280,28,C.ivory,"Geist",500,"center");
  let lines=["$ git clone https://github.com/yo-less/verso.git verso","$ cd verso","$ docker compose up -d"];
  lines.forEach((s,i)=>{let a=clamp((t-.12-i*.72)/.52);text(s.slice(0,Math.ceil(s.length*a)),280,405+i*106,37,C.ivory,"monospace",500)});
 });
 fade(p,()=>{
  const x=365,y=150,w=1190,bar=78,h=w*assets.login.height/assets.login.width;
  shadow(x,y,w,h+bar,19,C.paper,32);
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();
  rect(x,y,w,bar,0,"#213c30");
  ["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+19+i*24,y+15,12,12,6,c));
  rect(x+110,y+14,w-134,49,12,C.paper);
  const url="http://localhost:8083",n=Math.min(url.length,Math.floor(clamp((t-3.04)/1.02)*(url.length+1)));
  text(url.slice(0,n),x+132,y+39,27,C.forest,"Geist",500);
  if(n<url.length)line(x+132+ctx.measureText(url.slice(0,n)).width,y+25,x+132+ctx.measureText(url.slice(0,n)).width,y+53,C.forest,2);
  rect(x,y+bar,w,h,0,"#f8f1e5");
  fade(step(t,4.20,4.55),()=>img("login",x,y+bar,w,h,"cover"));ctx.restore();
 });
}
const scenes=[
 {id:"intro",len:3.5,draw:t=>brand(t,true)},
 {id:"automation",len:6.1,draw:automation},
 {id:"library",len:5.8,draw:library},
 {id:"details",len:4.4,draw:details},
 {id:"devices",len:4,draw:devices},
 {id:"statistics",len:3.5,draw:statistics},
 {id:"highlights",len:3,draw:highlights},
 {id:"year",len:6,draw:year},
 {id:"personalize",len:4.75,draw:personalize},
 {id:"branding",len:7.75,draw:branding},
 {id:"install",len:6.25,draw:install},
 {id:"close",len:3,draw:t=>brand(t,false)}
];
window.timeline=scenes.map(s=>({id:s.id,seconds:s.len}));window.duration=scenes.reduce((n,s)=>n+s.len,0);
function drawScene(i,t){ctx.save();scenes[i].draw(Math.max(0,t));ctx.restore()}
window.render=function(time){let t=Math.max(0,Math.min(window.duration-.001,time)),i=0;while(t>=scenes[i].len){t-=scenes[i++].len}drawScene(i,t);if(i>0&&scenes[i].id==="close"&&t<.85){
 const p=step(t,0,.85),edge=H*(1-p);ctx.save();ctx.translate(0,-H*p);drawScene(i-1,scenes[i-1].len-.001);ctx.restore();
 if(edge>0){const g=ctx.createLinearGradient(0,edge,0,edge+25);g.addColorStop(0,"#00000044");g.addColorStop(1,"#00000000");ctx.fillStyle=g;ctx.fillRect(0,edge,W,25);}
 }else if(i>0&&scenes[i].id==="automation"&&t<.65){
 const p=step(t,0,.65);ctx.save();ctx.beginPath();ctx.rect(0,0,W*(1-p),H);ctx.clip();drawScene(i-1,scenes[i-1].len-.001);ctx.restore();
 }else if(i>0&&scenes[i].id!=="close"&&scenes[i].id!=="automation"&&t<.52)fade(1-step(t,0,.52),()=>drawScene(i-1,scenes[i-1].len-.001))};
// Test the actual rendered pixels at each circle, before and after its own reveal.
// The check is dark forest against a solid gold circle; test only its inner square.
window.verifyChecks=function(){function darkPixels(x,y){let d=ctx.getImageData(x-13,y-13,28,28).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<45&&d[i+1]<95&&d[i+2]<65)n++;return n}
 return tickRows.map(row=>{drawScene(1,row.start-.08);let before=darkPixels(120,row.y);drawScene(1,row.start+.45);let after=darkPixels(120,row.y);return {row:row.label,before,after,ok:before===0&&after>45}})};
