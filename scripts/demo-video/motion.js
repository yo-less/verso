/* Verso demo V2: time-driven motion, real UI, feature-specific compositions. */
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
function brand(t,opening){let z=1+.025*clamp(t/1.5);img("landscape",-(z-1)*W/2,-(z-1)*H/2,W*z,H*z,"cover");img("logo",625,254,670,224);text(opening?"Your personal library":"github.com/yo-less/verso",960,550,opening?46:33,C.forest,opening?"Newsreader":"Geist",500,"center")}
function automation(t){
 bg(false,t);title("From file to bookshelf",90,110,false,76,"left");
 text("Automatic import",94,225,35,C.rust,"Geist",600);
 const box=browser("import-library",770,220,1100);
 const b=window.data.importCard, sx=box.w/1440,sy=box.h/900;
 const bx=box.x+b.x*sx,by=box.y+b.y*sy,bw=b.width*sx,bh=b.height*sy;
 // Hide one actual demo card until the illustrated import reaches it.
 fade(1-step(t,3.25,3.75),()=>rect(bx-2,by-2,bw+4,bh+4,3,C.paper));
 tickRows.forEach(row=>{let p=step(t,row.start,row.start+.38);tick(120,row.y,p);text(row.label,167,row.y,36,C.forest,"Geist",500)});
 let p=step(t,.25,3.28),x=mix(460,bx+bw*.5,p),y=mix(875,by+Math.min(bh*.36,95),p),w=mix(125,Math.min(bw*.78,105),p),h=w*1.48;
 fade(1-step(t,3.28,3.75),()=>{ctx.save();ctx.translate(x,y);ctx.rotate(-.12*(1-p));shadow(-w/2,-h/2,w,h,8,C.paper,24);let morph=step(t,1.4,2.25);fade(1-morph,()=>{text("EPUB",0,-7,w*.24,C.rust,"Geist",700,"center");line(-w*.28,h*.22,w*.28,h*.22,C.gold,3)});fade(morph,()=>img("moby-cover",-w/2,-h/2,w,h,"contain"));ctx.restore()});
 let glow=step(t,3.45,3.8)*(1-step(t,4.5,5));fade(glow,()=>{ctx.strokeStyle=C.gold;ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(bx-5,by-5,bw+10,bh+10,9);ctx.stroke()});
 text("Illustrated import sequence",95,1019,21,"#6b6f60");
}
function library(t){
 bg(true,t);title("Browse your library",960,84,true,76);
 let p=step(t,0,.65),w=1640+100*step(t,.6,3),x=(W-w)/2,y=mix(278,174,p);
 browser("hero-library",x,y,w,1+.1*step(t,.7,3),.55,.25);
 fade(step(t,1.95,2.35),()=>browser("search",x,y,w,1,.5,0));
}
function details(t){
 bg(false,t);title("Read, shelve, discover",960,84,false,76);
 let p=step(t,0,2.1);browser("book-light",120,177,1680,1+.20*p,.45,.08);
 // The actual related-books section moves into view, as if scrolling down.
 let q=step(t,1.3,1.95);if(q>0){ctx.save();ctx.translate(0,(1-q)*600);fade(q,()=>{let im=assets.related,w=1450,h=Math.min(440,w*im.height/im.width);shadow(235,1050-h,w,h,18,C.paper);img("related",260,1060-h,w-50,h-25)});ctx.restore()}
}
function devices(t){
 bg(true,t);title("Pick up where you left off",960,85,true,78);
 const p=step(t,0,.55);browser("book-light",75,232+(1-p)*80,1190,1.04,.5,0);
 let q=step(t,.2,.85);ctx.save();ctx.translate((1-q)*150,0);shadow(1370,187,420,755,39,"#202722");rect(1395,212,370,650,14,"#ecebe1");rect(1395,212,370,56,14,"#d6d9cf");text("My books",1420,241,25,C.forest,"Geist",600);
 ["Moby-Dick","Pride and Prejudice","Frankenstein"].forEach((s,i)=>{let a=step(t,1.05+i*.45,1.5+i*.45),y=290+i*174;fade(a,()=>{ctx.save();ctx.filter="grayscale(1)";img(["moby-cover","pride-cover","frankenstein-cover"][i],1416,y,78,118);ctx.restore();text(s,1510,y+25,18,C.forest,"Newsreader",600);line(1510,y+79,1730,y+79,"#b2b6aa",5);line(1510,y+79,1510+220*[.38,.64,.21][i]*step(t,2.3,3.1),y+79,C.forest,5);text(Math.round([38,64,21][i]*step(t,2.3,3.1))+"%",1510,y+101,17,C.forest)})});
 rect(1518,897,124,6,3,"#6a7469");ctx.restore();
 const s=step(t,.55,1.1);fade(s,()=>{let x=1320,y=590;rect(x-45,y-45,90,90,45,C.gold);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI*2*step(t,1.15,2.15));ctx.strokeStyle=C.forest;ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,23,-2.7,.1);ctx.stroke();ctx.beginPath();ctx.arc(0,0,23,.45,3.25);ctx.stroke();line(23,2,14,-7,C.forest,5);line(23,2,29,-8,C.forest,5);line(-23,-2,-14,7,C.forest,5);line(-23,-2,-29,8,C.forest,5);ctx.restore()});
 text("Kobo  ·  KOReader",75,1017,32,C.ivory,"Geist",550);text("Illustrated device",1580,985,22,C.muted,"Geist",450,"center")
}
function statistics(t){
 bg(false,t);title("Your reading, in perspective",960,85,false,74);
 browser("stats",545,188,1300,1+.12*step(t,.4,3.5),.8,.25);
 fade(step(t,2.15,2.6),()=>browser("stats-detail",545,188,1300,1,.5,0));
 const vals=window.data.stats;[["This week",vals[1]],["Best streak",vals[3]]].forEach(([s,v],i)=>{let p=step(t,.4+i*.7,1.0+i*.7);reveal(t,.2+i*.7,.7+i*.7,()=>{let number=String(v||"").match(/^\d+/);let value=number?String(Math.round(Number(number[0])*p))+v.slice(number[0].length):v;text(value,85,420+i*245,64,C.rust,"Newsreader",600);text(s,89,488+i*245,29,C.forest)})});
}
function highlights(t){
 bg(true,t);title("Keep the words that matter",960,85,true,76);
 browser("highlights-light",75,190,1350,1+.11*step(t,0,3.5),.7,.25);
 let p=step(t,.35,1.05);ctx.save();ctx.translate(1035+(1-p)*220,340+(1-p)*70);ctx.rotate(.035*p);fade(p,()=>{shadow(0,0,795,510,15,C.paper);text("“",48,95,123,C.rust,"Newsreader",600);rect(49,175,570*step(t,1.1,1.9),65,3,"#ead69e");rect(49,248,315*step(t,1.75,2.35),65,3,"#ead69e");text("I am no bird; and no net",49,210,58,C.forest,"Newsreader",550);text("ensnares me.",49,283,58,C.forest,"Newsreader",550);text("Charlotte Brontë · Jane Eyre",50,405,27,C.rust,"Geist",500)});ctx.restore()
}
function year(t){
 bg(true,t);title("Your year in books",960,79,true,78);let p=step(t,0,.8);
 phone("story-rhythm",mix(765,535,p),612,360,-.15*p);phone("story-summary",mix(1155,1385,p),612,360,.15*p);
 let seq=["story-intro","story-finished","story-authors","story-rhythm","story-summary"],i=Math.min(4,Math.floor(t/1.15));phone(seq[i],960,600,438,0)
}
function personalize(t){
 bg(false,t);title("Make it yours",960,85,false,82);
 // Four distinct themes form an uncluttered, readable grid.
 [["library-light",230,160],["library-dark",1010,160],["styled-sunset-light",230,619],["styled-ocean",1010,619]].forEach(([k,x,y],i)=>{let p=step(t,.12+i*.19,.62+i*.19);fade(p,()=>browser(k,x,y+(1-p)*45,680))});
 let p=step(t,2.4,2.9);fade(p,()=>{ctx.fillStyle="#102e2088";ctx.fillRect(0,0,W,H);browser("branding-viewport",440,160,1040);rect(612,928,696,74,37,C.forest);text("Custom logos & instance branding",960,965,33,C.ivory,"Geist",550,"center")})
}
function install(t){
 bg(true,t);title("Self-hosted. Open source.",960,105,true,76);
 shadow(230,250,1460,610,22,"#0b1913");rect(230,250,1460,61,21,"#2a4838");["#bf6853","#d7b368","#7e9c80"].forEach((c,i)=>rect(259+i*30,272,16,16,8,c));text("Terminal",960,280,28,C.ivory,"Geist",500,"center");
 let lines=["$ git clone https://github.com/yo-less/verso.git","$ cd verso","$ docker compose up -d"];
 lines.forEach((s,i)=>{let p=clamp((t-.15-i*.62)/.55);text(s.slice(0,Math.ceil(s.length*p)),280,405+i*106,42,C.ivory,"monospace",500)});
 reveal(t,2.0,2.35,()=>text("http://localhost:8083",280,766,34,"#d0aa65","Geist",600));
}
const scenes=[
 {id:"intro",len:1.5,draw:t=>brand(t,true)},
 {id:"automation",len:5,draw:automation},
 {id:"library",len:3,draw:library},
 {id:"details",len:3,draw:details},
 {id:"devices",len:5,draw:devices},
 {id:"statistics",len:4,draw:statistics},
 {id:"highlights",len:4,draw:highlights},
 {id:"year",len:6,draw:year},
 {id:"personalize",len:4,draw:personalize},
 {id:"install",len:3,draw:install},
 {id:"close",len:1.5,draw:t=>brand(t,false)}
];
window.timeline=scenes.map(s=>({id:s.id,seconds:s.len}));window.duration=scenes.reduce((n,s)=>n+s.len,0);
function drawScene(i,t){ctx.save();scenes[i].draw(Math.max(0,t));ctx.restore()}
window.render=function(time){let t=Math.max(0,Math.min(window.duration-.001,time)),i=0;while(t>=scenes[i].len){t-=scenes[i++].len}drawScene(i,t);if(i>0&&t<.17)fade(1-step(t,0,.17),()=>drawScene(i-1,scenes[i-1].len-.001))};
// Test the actual rendered pixels at each circle, before and after its own reveal.
// The check is dark forest against a solid gold circle; test only its inner square.
window.verifyChecks=function(){function darkPixels(x,y){let d=ctx.getImageData(x-13,y-13,28,28).data,n=0;for(let i=0;i<d.length;i+=4)if(d[i]<45&&d[i+1]<95&&d[i+2]<65)n++;return n}
 return tickRows.map(row=>{drawScene(1,row.start-.08);let before=darkPixels(120,row.y);drawScene(1,row.start+.45);let after=darkPixels(120,row.y);return {row:row.label,before,after,ok:before===0&&after>45}})};
