/* Verso demo V11: time-driven motion, real UI, feature-specific compositions. */
const W=1920,H=1080,C={forest:"#102e20",paper:"#f8f1e5",rust:"#a23e2a",gold:"#b58a40",ivory:"#fff1dc",muted:"#a8bcaa"};
const ctx=document.querySelector("canvas").getContext("2d",{willReadFrequently:true});
const assets={},names=["import-library","hero-library","library-light","library-dark","book-light","highlights-light","stats","stats-detail","search","related","moby-cover","pride-cover","frankenstein-cover","story-intro","story-finished","story-authors","story-rhythm","story-summary","styled-sunset-light","styled-ocean","branding-viewport","mobile-home","login","login-background"];
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
function browser(k,x,y,w,zoom=1,focusX=.5,focusY=.5,withShadow=true){let im=assets[k],bar=w*.025,h=w*im.height/im.width;if(withShadow)shadow(x,y,w,h+bar,19,C.paper);else rect(x,y,w,h+bar,19,C.paper);ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();rect(x,y,w,bar,0,"#213c30");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+bar*.45+i*bar*.52,y+bar*.36,bar*.24,bar*.24,bar*.12,c));ctx.save();ctx.beginPath();ctx.rect(x,y+bar,w,h);ctx.clip();let sw=im.width/zoom,sh=im.height/zoom;ctx.drawImage(im,clamp(focusX)*(im.width-sw),clamp(focusY)*(im.height-sh),sw,sh,x,y+bar,w,h);ctx.restore();ctx.restore();return {x,y:y+bar,w,h}}
function phone(k,cx,cy,w,angle=0){let im=assets[k],bezel=12,iw=w-2*bezel,ih=iw*im.height/im.width,h=ih+2*bezel;ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);shadow(-w/2,-h/2,w,h,38,"#0d1410",32);ctx.strokeStyle="#818b80";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,38);ctx.stroke();ctx.save();ctx.beginPath();ctx.roundRect(-iw/2,-ih/2,iw,ih,26);ctx.clip();img(k,-iw/2,-ih/2,iw,ih);ctx.restore();ctx.restore()}
function reveal(t,a,b,fn,dy=26){let p=step(t,a,b);ctx.save();ctx.translate(0,(1-p)*dy);fade(p,fn);ctx.restore()}
const tickRows=[{y:505,start:1.35,label:"Import"},{y:601,start:2.05,label:"Convert if needed"},{y:697,start:2.75,label:"Metadata & cover"},{y:793,start:3.45,label:"Organize"}];
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
 }
}
function automation(t){
 bg(false,t);title("From file to bookshelf",960,85,false,76);
 const box=browser("import-empty",720,210,1120),b=window.data.importCover,card=window.data.importCard,s=box.w/1440;
 const target={x:box.x+(b.x+b.width/2)*s,y:box.y+(b.y+b.height/2)*s,w:b.width*s,h:b.height*s};
 const organize=step(t,3.45,3.83),flight=step(t,3.83,5.35),land=step(t,5.35,5.60);
 const im=assets["import-library"],ratio=im.width/1440;
 fade(land,()=>ctx.drawImage(im,card.x*ratio,card.y*ratio,card.width*ratio,card.height*ratio,box.x+card.x*s,box.y+card.y*s,card.width*s,card.height*s));
 const drop=step(t,.22,1.18),fx=450,fy=300;
 const converted=step(t,2.05,2.43),cover=step(t,2.75,3.13);
 const wiggle=Math.sin((t-1.12)*19)*.045*(step(t,1.12,1.27)-step(t,1.95,2.15));
 function paper(x,y,angle,alpha){
  fade(alpha,()=>{
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);
   rect(-92,-50,184,100,6,"#fffcf4");
   ctx.fillStyle="#d4b87e";ctx.beginPath();ctx.moveTo(66,-50);ctx.lineTo(92,-24);ctx.lineTo(66,-24);ctx.closePath();ctx.fill();
   text("EPUB",0,-13,26,C.forest,"Geist",650,"center");
   fade(1-converted,()=>{line(-46,14,45,14,"#cbb88f",2);line(-46,25,26,25,"#cbb88f",2)});
   fade(converted,()=>text("Ready to import",0,20,16,C.forest,"Geist",500,"center"));
   ctx.restore();
  });
 }
 // The file is landscape-shaped and fully contained once it enters
 // the folder. The interior clipping also prevents any stray pixels.
 fade(1-organize,()=>{
  ctx.save();ctx.translate(fx,fy);
  ctx.scale(1-.06*organize,1-.16*organize);
  shadow(-133,-75,266,159,14,"#a47e42",14);
  rect(-133,-95,112,35,9,"#a47e42");
  rect(-120,-64,240,136,10,"#edd5a5");
  ctx.restore();
  if(drop<1){
   const px=mix(155,fx,drop),py=mix(278,fy-22,drop)-52*Math.sin(Math.PI*drop);
   // The approaching sheet remains visible outside the folder only
   // until it enters; its bottom never reaches below the folder front.
   paper(px,py,-.11*(1-drop),1-cover);
  }else{
   ctx.save();ctx.beginPath();ctx.roundRect(fx-120,fy-64,240,136,10);ctx.clip();
   paper(fx,fy-18,wiggle,1-cover);ctx.restore();
  }
  // Folded front is drawn after the file, occluding the lower edge.
  ctx.save();ctx.translate(fx,fy);ctx.scale(1-.06*organize,1-.16*organize);
  ctx.fillStyle="#c9a467";ctx.beginPath();ctx.moveTo(-143,-1);ctx.lineTo(143,-1);ctx.lineTo(126,83);ctx.quadraticCurveTo(124,92,113,92);ctx.lineTo(-113,92);ctx.quadraticCurveTo(-124,92,-126,83);ctx.closePath();ctx.fill();
  line(-130,7,130,7,"#ead3a5",2);ctx.restore();
  text("Watched import folder",fx,fy+125,27,C.forest,"Newsreader",600,"center");
  fade(1-step(t,.65,1.15),()=>text("Moby-Dick.epub",155,377,22,C.forest,"Geist",500,"center"));
 });
 // The real cover emerges in place as Metadata & cover is checked.
 // Once Organize begins, the folder softly collapses and dissolves;
 // the cover is the only element that travels to the shelf.
 const x=mix(fx,target.x,flight),y=mix(fy-12,target.y,flight)-85*Math.sin(Math.PI*flight);
 const w=mix(132,target.w,flight),hh=mix(190,target.h,flight);
 fade(cover*(1-land),()=>{ctx.save();ctx.translate(x,y+34*(1-cover));ctx.rotate(-.035*(1-flight));img("moby-cover",-w/2,-hh/2,w,hh,"cover");ctx.restore()});
 line(120,529,120,769,"#d6c29a",2);
 tickRows.forEach(row=>{let p=step(t,row.start,row.start+.38);tick(120,row.y,p);text(row.label,167,row.y,35,C.forest,"Geist",500)});
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
 }else browser("browse-results",x,y,w);
 // Explanation lives with the title; the area below the window stays clear.
}
function details(t){
 bg(false,t);
 const heading=step(t,1.25,1.72),p=step(t,2.85,3.38);
 fade(1-heading,()=>title("Explore a book",960,84,false,76));
 fade(heading,()=>title("Discover related titles",960,84,false,76));
 const i=Math.round(clamp((t-.85)/2.0)*60);
 browser("detail-scroll-"+i,350,155,1220);
 // Arrive at the real recommendation section before lifting it into
 // the foreground; retain the editorial inset from V10.
 const im=assets["related-focus"],scale=Math.min(1030/im.width,475/im.height,1.65);
 const iw=im.width*scale,ih=im.height*scale,pad=24;
 const w=iw+pad*2,h=ih+pad*2,x=1810-w+(1-p)*65,y=Math.min(440,890-h)+(1-p)*25;
 fade(p,()=>{
  shadow(x,y,w,h,18,C.paper,34);
  ctx.save();ctx.beginPath();ctx.roundRect(x+pad,y+pad,iw,ih,6);ctx.clip();
  ctx.drawImage(im,x+pad,y+pad,iw,ih);ctx.restore();
 });
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
 rect(x-42,y-42,84,84,42,C.gold);
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*2*spin);
 ctx.strokeStyle=C.forest;ctx.lineWidth=4.5;ctx.lineCap="round";ctx.lineJoin="round";
 // Each head meets its own arc at the exact tangent endpoint.
 // Draw the two sides of each arrowhead as one joined path.
 for(const start of [-Math.PI+.42,.42]){
  const end=start+Math.PI-.84,R=23,ex=R*Math.cos(end),ey=R*Math.sin(end);
  const tx=-Math.sin(end),ty=Math.cos(end),nx=-ty,ny=tx;
  ctx.beginPath();ctx.arc(0,0,R,start,end);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ex-10*tx+8*nx,ey-10*ty+8*ny);ctx.lineTo(ex,ey);ctx.lineTo(ex-10*tx-8*nx,ey-10*ty-8*ny);ctx.stroke();
 }
 ctx.restore();
 // Conceptual progress indicator, explicitly distinct from the captured UI.
 rect(96,875,1090,86,14,"#274739");text("Moby-Dick  ·  Reading progress",125,901,26,C.ivory,"Geist",550);line(125,936,950,936,"#637a6c",6);line(125,936,125+825*synced/100,936,C.gold,6);text(Math.round(synced)+"%",1100,936,32,C.ivory,"Geist",600,"right");
 fade(step(t,2.15,2.45),()=>text("Progress synchronized",640,990,25,C.muted,"Geist",500,"center"));
 text("KOReader  ·  Kobo",1585,932,29,C.ivory,"Geist",550,"center");text("Illustrated device",1585,970,21,C.muted,"Geist",450,"center");
}
function statistics(t){
 bg(false,t);title("Your reading, in perspective",960,85,false,74);
 const i=Math.round(clamp((t-1.15)/3.2)*96);
 browser("stats-scroll-"+i,350,155,1220);
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
 });
 fade(step(ending,.35,1),()=>{
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
 bg(true,6.25);fade(1-step(t,0,.9),()=>title("Run Verso yourself",960,105,true,76));
 installBrowser(6.25,step(t,.15,1.05));
}
const scenes=[
 {id:"intro",len:3.5,draw:t=>brand(t,true)},
 {id:"automation",len:6.1,draw:automation},
 {id:"library",len:5.8,draw:library},
 {id:"details",len:5.0,draw:details},
 {id:"devices",len:4,draw:devices},
 {id:"statistics",len:5.4,draw:statistics},
 {id:"highlights",len:3,draw:highlights},
 {id:"year",len:6,draw:year},
 {id:"personalize",len:13.1,draw:personalize},
 {id:"install",len:6.25,draw:install},
 {id:"close",len:3.8,draw:close}
];
window.timeline=scenes.map(s=>({id:s.id,seconds:s.len}));window.duration=scenes.reduce((n,s)=>n+s.len,0);
function drawScene(i,t){ctx.save();scenes[i].draw(Math.max(0,t));ctx.restore()}
window.render=function(time){let t=Math.max(0,Math.min(window.duration-.001,time)),i=0;while(t>=scenes[i].len){t-=scenes[i++].len}drawScene(i,t);if(i>0&&scenes[i].id==="automation"&&t<.65){
 const p=step(t,0,.65);ctx.save();ctx.beginPath();ctx.rect(0,0,W*(1-p),H);ctx.clip();drawScene(i-1,scenes[i-1].len-.001);ctx.restore();
 }else if(i>0&&scenes[i].id!=="close"&&scenes[i].id!=="automation"&&t<.52)fade(1-step(t,0,.52),()=>drawScene(i-1,scenes[i-1].len-.001))};
// Test the actual rendered pixels at each circle, before and after its own reveal.
// The check is dark forest against a solid gold circle; test only its inner square.
window.verifyChecks=function(){function darkPixels(x,y){let d=ctx.getImageData(x-13,y-13,28,28).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<45&&d[i+1]<95&&d[i+2]<65)n++;return n}
 return tickRows.map(row=>{drawScene(1,row.start-.08);let before=darkPixels(120,row.y);drawScene(1,row.start+.45);let after=darkPixels(120,row.y);return {row:row.label,before,after,ok:before===0&&after>45}})};
