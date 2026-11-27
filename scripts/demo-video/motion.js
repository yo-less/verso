/* Verso demo V4: time-driven motion, real UI, feature-specific compositions. */
const W=1920,H=1080,C={forest:"#102e20",paper:"#f8f1e5",rust:"#a23e2a",gold:"#b58a40",ivory:"#fff1dc",muted:"#a8bcaa"};
const ctx=document.querySelector("canvas").getContext("2d",{willReadFrequently:true});
const assets={},names=["import-library","hero-library","library-light","library-dark","book-light","highlights-light","stats","stats-detail","search","related","moby-cover","pride-cover","frankenstein-cover","story-intro","story-finished","story-authors","story-rhythm","story-summary","styled-sunset-light","styled-ocean","branding-viewport","mobile-home"];
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
function browser(k,x,y,w,zoom=1,focusX=.5,focusY=.5){let im=assets[k],bar=w*.025,h=w*im.height/im.width;shadow(x,y,w,h+bar,19,C.paper);ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h+bar,19);ctx.clip();rect(x,y,w,bar,0,"#213c30");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(x+bar*.45+i*bar*.52,y+bar*.36,bar*.24,bar*.24,bar*.12,c));ctx.save();ctx.beginPath();ctx.rect(x,y+bar,w,h);ctx.clip();let sw=im.width/zoom,sh=im.height/zoom;ctx.drawImage(im,clamp(focusX)*(im.width-sw),clamp(focusY)*(im.height-sh),sw,sh,x,y+bar,w,h);ctx.restore();ctx.restore();return {x,y:y+bar,w,h}}
function phone(k,cx,cy,w,angle=0){let im=assets[k],bezel=12,iw=w-2*bezel,ih=iw*im.height/im.width,h=ih+2*bezel;ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);shadow(-w/2,-h/2,w,h,38,"#0d1410",32);ctx.strokeStyle="#818b80";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,38);ctx.stroke();ctx.save();ctx.beginPath();ctx.roundRect(-iw/2,-ih/2,iw,ih,26);ctx.clip();img(k,-iw/2,-ih/2,iw,ih);ctx.restore();ctx.restore()}
function reveal(t,a,b,fn,dy=26){let p=step(t,a,b);ctx.save();ctx.translate(0,(1-p)*dy);fade(p,fn);ctx.restore()}
const tickRows=[{y:428,start:.65,label:"Import"},{y:522,start:1.35,label:"Convert if needed"},{y:616,start:2.05,label:"Metadata & cover"},{y:710,start:2.75,label:"Organize"}];
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
  text("Self-hosted  ·  Open source",960,526,36,C.forest,"Geist",500,"center");
  text("github.com/yo-less/verso",960,588,33,C.forest,"Geist",550,"center");
 }
}
function automation(t){
 bg(false,t);title("From file to bookshelf",90,110,false,76,"left");
 text("Automatic import",94,225,35,C.rust,"Geist",600);
 const box=browser("import-library",770,220,1050);
 const b=window.data.importCard, sx=box.w/1440,sy=box.h/900;
 const bx=box.x+b.x*sx,by=box.y+b.y*sy,bw=b.width*sx,bh=b.height*sy;
 // Hide one actual demo card until the illustrated import reaches it.
 fade(1-step(t,3.0,3.48),()=>rect(bx-2,by-2,bw+4,bh+4,3,C.paper));
 tickRows.forEach(row=>{let p=step(t,row.start,row.start+.38);tick(120,row.y,p);text(row.label,167,row.y,36,C.forest,"Geist",500)});
 let p=step(t,.25,3.05),x=mix(460,bx+bw*.5,p),y=mix(875,by+Math.min(bh*.36,95),p),w=mix(125,Math.min(bw*.78,105),p),h=w*1.48;
 fade(1-step(t,3.05,3.48),()=>{ctx.save();ctx.translate(x,y);ctx.rotate(-.12*(1-p));shadow(-w/2,-h/2,w,h,8,C.paper,24);let morph=step(t,1.4,2.25);fade(1-morph,()=>{text("EPUB",0,-7,w*.24,C.rust,"Geist",700,"center");line(-w*.28,h*.22,w*.28,h*.22,C.gold,3)});fade(morph,()=>img("moby-cover",-w/2,-h/2,w,h,"contain"));ctx.restore()});
 let glow=step(t,3.15,3.48)*(1-step(t,3.82,4));fade(glow,()=>{ctx.strokeStyle=C.gold;ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(bx-5,by-5,bw+10,bh+10,9);ctx.stroke()});
 text("Illustrated import sequence",95,1019,21,"#6b6f60");
}
function library(t){
 bg(true,t);title("Browse your library",960,84,true,76);
 const p=step(t,0,.55),w=1320,x=(W-w)/2,y=155+(1-p)*36;
 browser("hero-library",x,y,w);
 fade(step(t,1.65,2.1),()=>browser("library-light",x,y,w));
}
function details(t){
 bg(false,t);title("Read, shelve, discover",960,84,false,76);
 browser("book-light",300,155,1320);
 const q=step(t,2.0,2.5);
 if(q>0)fade(q,()=>{const im=assets.related,w=1220,h=Math.min(530,w*im.height/im.width);shadow(350,440,w,h+70,18,C.paper);img("related",365,455,w-30,h+40);});
}
function devices(t){
 bg(true,t);title("Pick up where you left off",960,85,true,76);
 browser("book-light",96,180,1090);
 shadow(1395,180,380,715,38,"#202722");rect(1418,203,334,640,14,"#ecebe1");
 text("My books",1441,238,25,C.forest,"Geist",600);
 const a=step(t,.45,1.3),b=step(t,2.0,2.85),progress=38+9*a,synced=38+9*b;
 [["Moby-Dick","moby-cover",progress],["Pride and Prejudice","pride-cover",64],["Frankenstein","frankenstein-cover",21]].forEach(([s,k,v],i)=>{
  const y=300+i*163;ctx.save();ctx.filter="grayscale(1)";img(k,1437,y,73,110);ctx.restore();
  text(s,1523,y+20,17,C.forest,"Newsreader",600);
  line(1523,y+66,1728,y+66,"#b2b6aa",5);line(1523,y+66,1523+205*v/100,y+66,C.forest,5);text(Math.round(v)+"%",1523,y+89,18,C.forest);
 });
 rect(1520,865,130,6,3,"#6a7469");
 const spin=step(t,1.3,2.0),x=1290,y=520;
 rect(x-42,y-42,84,84,42,C.gold);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*2*spin);ctx.strokeStyle=C.forest;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,22,-2.7,.1);ctx.stroke();ctx.beginPath();ctx.arc(0,0,22,.45,3.25);ctx.stroke();line(22,2,14,-7,C.forest,5);line(22,2,29,-8,C.forest,5);line(-22,-2,-14,7,C.forest,5);line(-22,-2,-29,8,C.forest,5);ctx.restore();
 // Conceptual progress indicator, explicitly distinct from the captured UI.
 rect(96,900,1090,92,14,"#274739");text("Moby-Dick  ·  Reading progress",125,930,26,C.ivory,"Geist",550);line(125,965,950,965,"#637a6c",6);line(125,965,125+825*synced/100,965,C.gold,6);text(Math.round(synced)+"%",1100,965,32,C.ivory,"Geist",600,"right");
 text(b>.99?"Progress synchronized":"Verso  ·  Illustrated sync",640,1027,25,C.muted,"Geist",500,"center");
 text("Kobo  ·  KOReader",1585,946,29,C.ivory,"Geist",550,"center");text("Illustrated device",1585,986,21,C.muted,"Geist",450,"center");
}
function statistics(t){
 bg(false,t);title("Your reading, in perspective",960,85,false,74);
 browser("stats",300,155,1320);
 fade(step(t,1.65,2.15),()=>browser("stats-detail",300,155,1320));
}
function highlights(t){
 bg(true,t);title("Keep the words that matter",960,85,true,76);
 browser("highlights-light",90,190,1240);
 let p=step(t,.35,.95);ctx.save();ctx.translate(1045+(1-p)*85,350+(1-p)*40);
 fade(p,()=>{shadow(0,0,770,465,15,C.paper,30);text("“",48,88,105,C.rust,"Newsreader",600);rect(48,160,565*step(t,.95,1.5),62,3,"#ead69e");rect(48,230,315*step(t,1.5,2.05),62,3,"#ead69e");text("I am no bird; and no net",49,192,55,C.forest,"Newsreader",550);text("ensnares me.",49,262,55,C.forest,"Newsreader",550);text("Charlotte Brontë · Jane Eyre",50,370,26,C.rust,"Geist",500)});ctx.restore();
}
function year(t){
 bg(true,t);title("Your year in books",960,79,true,78);let p=step(t,0,.55);
 // Each of the five captures appears in exactly one phone/slot.
 phone("story-rhythm",mix(730,535,p),609,342,-.10*p);
 phone("story-summary",mix(1190,1385,p),609,342,.10*p);
 const seq=["story-intro","story-finished","story-authors"],i=Math.min(2,Math.floor(t/1.5)),q=t-i*1.5;
 phone(seq[i],960,603,420,0);
 if(i>0&&q<.24)fade(1-step(q,0,.24),()=>phone(seq[i-1],960,603,420,0));
}
function personalize(t){
 bg(false,t);title("Make it yours",960,85,false,82);
 const seq=["library-light","library-dark","styled-sunset-light","styled-ocean","branding-viewport"];
 const starts=[0,1.03,2.06,3.09,4.12];
 let i=starts.filter(s=>t>=s).length-1;i=Math.max(0,i);
 const q=t-starts[i];
 browser(seq[i],330,150,1260);
 if(i>0&&q<.28)fade(1-step(q,0,.28),()=>browser(seq[i-1],330,150,1260));
 if(i===4)fade(step(q,.1,.4),()=>{rect(630,967,660,61,30,C.forest);text("Custom logos & instance branding",960,998,29,C.ivory,"Geist",550,"center");});
}
function install(t){
 bg(true,t);title("Run Verso yourself",960,105,true,76);
 shadow(230,250,1460,610,22,"#0b1913");rect(230,250,1460,61,21,"#2a4838");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(259+i*30,272,16,16,8,c));text("Terminal",960,280,28,C.ivory,"Geist",500,"center");
 let lines=["$ git clone https://github.com/yo-less/verso.git verso","$ cd verso","$ docker compose up -d"];
 lines.forEach((s,i)=>{let p=clamp((t-.12-i*.72)/.52);text(s.slice(0,Math.ceil(s.length*p)),280,405+i*106,37,C.ivory,"monospace",500)});
 reveal(t,2.0,2.35,()=>text("http://localhost:8083",280,766,34,"#d0aa65","Geist",600));
}
const scenes=[
 {id:"intro",len:3.5,draw:t=>brand(t,true)},
 {id:"automation",len:4,draw:automation},
 {id:"library",len:3,draw:library},
 {id:"details",len:4,draw:details},
 {id:"devices",len:4,draw:devices},
 {id:"statistics",len:3.5,draw:statistics},
 {id:"highlights",len:3,draw:highlights},
 {id:"year",len:4.5,draw:year},
 {id:"personalize",len:5.5,draw:personalize},
 {id:"install",len:3.5,draw:install},
 {id:"close",len:2.5,draw:t=>brand(t,false)}
];
window.timeline=scenes.map(s=>({id:s.id,seconds:s.len}));window.duration=scenes.reduce((n,s)=>n+s.len,0);
function drawScene(i,t){ctx.save();scenes[i].draw(Math.max(0,t));ctx.restore()}
window.render=function(time){let t=Math.max(0,Math.min(window.duration-.001,time)),i=0;while(t>=scenes[i].len){t-=scenes[i++].len}drawScene(i,t);if(i>0&&t<.25)fade(1-step(t,0,.25),()=>drawScene(i-1,scenes[i-1].len-.001))};
// Test the actual rendered pixels at each circle, before and after its own reveal.
// The check is dark forest against a solid gold circle; test only its inner square.
window.verifyChecks=function(){function darkPixels(x,y){let d=ctx.getImageData(x-13,y-13,28,28).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<45&&d[i+1]<95&&d[i+2]<65)n++;return n}
 return tickRows.map(row=>{drawScene(1,row.start-.08);let before=darkPixels(120,row.y);drawScene(1,row.start+.45);let after=darkPixels(120,row.y);return {row:row.label,before,after,ok:before===0&&after>45}})};
