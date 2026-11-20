// Independent forearm layers use the existing character artwork, keeping the
// face animation and live audio pipeline untouched.
const stage=document.getElementById('gatorStage');
const rig=document.createElement('div');rig.className='gator-stage gesture-rig';rig.setAttribute('aria-hidden','true');
for(const side of ['left','right']){const arm=document.createElement('span');arm.className=`gesture-arm gesture-${side}`;rig.append(arm);}
stage.after(rig);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function sync(){rig.dataset.speaking=String(stage.dataset.state==='speaking'&&!motion.matches);}
new MutationObserver(sync).observe(stage,{attributes:true,attributeFilter:['data-state']});motion.addEventListener('change',sync);sync();
let greetingTimer;
function greet(){if(motion.matches||stage.dataset.state==='speaking')return;rig.classList.remove('gesture-greeting');void rig.offsetWidth;rig.classList.add('gesture-greeting');clearTimeout(greetingTimer);greetingTimer=setTimeout(()=>rig.classList.remove('gesture-greeting'),1800);}
stage.addEventListener('click',greet);stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')greet();});
