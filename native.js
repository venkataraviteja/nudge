/* Native layer: runs only inside the Capacitor Android/iOS app. */
(function(){
const C=window.Capacitor;
if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
const P=C.Plugins||{},LN=P.LocalNotifications,SRp=P.SpeechRecognition,TTS=P.TextToSpeech;
$('#hint').textContent='Tap the mic and speak. Alerts arrive even when the app is closed.';

/* Spoken output */
if(TTS)window.speak=(text,cb,lg)=>{TTS.speak({text,lang:lg||'en-IN',rate:1}).then(()=>cb&&cb()).catch(()=>cb&&cb())};

/* Voice input */
if(SRp)window.listen=async()=>{
  if(listening)return;listening=true;$('#mic').classList.add('live');
  try{const r=await SRp.start({language:S.lang||'en-IN',maxResults:1,partialResults:false,popup:false});
    const t=r&&r.matches&&r.matches[0];if(t)handle(t)}catch(e){}
  listening=false;$('#mic').classList.remove('live');
};

/* Background alerts: schedule OS-level notifications for every pending task */
let sig='';
async function sync(){
  if(!LN)return;
  const now=Date.now(),list=[];
  for(const t of S.tasks){
    if(t.status!='pending')continue;
    const base=(t.id%100000000)*3,db=sod(addD(t.due,-1)).getTime()+9*36e5;
    const nm=new Date(t.due).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    if(db>now&&t.due-db>72e5)list.push({id:base,title:'Tomorrow',body:`Heads-up: “${t.title}” at ${nm}.`,at:db,extra:{taskId:t.id,k:'day'}});
    if(t.due-36e5>now)list.push({id:base+1,title:'One hour to go',body:`“${t.title}” at ${nm}.`,at:t.due-36e5,extra:{taskId:t.id,k:'hr'}});
    if(t.due>now)list.push({id:base+2,title:'Task time',body:`Hi ${S.name}, did you complete “${t.title}”? Tap to answer.`,at:t.due,extra:{taskId:t.id,k:'due'}});
  }
  const s=JSON.stringify(list);if(s==sig)return;sig=s;
  try{
    const p=await LN.getPending();
    if(p.notifications.length)await LN.cancel({notifications:p.notifications.map(n=>({id:n.id}))});
    if(list.length)await LN.schedule({notifications:list.map(n=>({id:n.id,title:n.title,body:n.body,extra:n.extra,schedule:{at:new Date(n.at),allowWhileIdle:true}}))});
  }catch(e){}
}

/* Tapping the "task time" notification opens the app and asks by voice */
if(LN)LN.addListener('localNotificationActionPerformed',e=>{
  const x=e.notification.extra||{},t=S.tasks.find(y=>y.id==x.taskId);
  if(t&&t.status=='pending'&&x.k=='due'){t.sent=t.sent||{};t.sent.due=1;save();checkin(t)}
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});

(async()=>{
  try{if(LN)await LN.requestPermissions();if(SRp)await SRp.requestPermissions()}catch(e){}
  sync();setInterval(sync,3000);
})();
})();
