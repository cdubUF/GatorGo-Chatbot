import {test, expect} from '@playwright/test';

async function setup(page) {
 await page.route('**/api/health', r=>r.fulfill({json:{mode:'mock', demo:false, speech_enabled:false}}));
 await page.goto('/'); await page.click('#continueGator');
 await page.uncheck('#speakReplies');
}
const reaction = (page, role, text, decision) => page.evaluate(({role,text,decision})=>document.dispatchEvent(new CustomEvent('concierge-reaction',{detail:{role,text,decision}})),{role,text,decision});

test('expressions follow real typed replies and keep audio mouth movement', async({page})=>{
 await setup(page);
 await page.route('**/api/chat', r=>r.fulfill({json:{session_id:'b1193ac0-b20c-4813-8804-21a0327ae9e4',mode:'mock',demo:false,reply:'Wonderful! Enjoy your anniversary.',sources:[],suggestions:[],decision:{level:'ai'}}}));
 await page.fill('#messageInput','We are celebrating our anniversary');await page.click('#sendBtn');
 const face=page.locator('#guideArt');
 await expect(face).toHaveAttribute('data-expression','cheerful');
 await expect(face).toHaveAttribute('aria-label',/cheerful/);
 expect(await face.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('gator-expressions.png');
 await face.evaluate(el=>el.classList.add('mouth-open'));
 expect(await face.evaluate(el=>getComputedStyle(el).backgroundPosition)).toBe('100% 0%');
 await reaction(page,'user','My room is dirty and I am upset');
 await reaction(page,'agent','Please contact hotel staff.',{level:'human'});
 await expect(face).toHaveAttribute('data-expression','empathetic');
 expect(await face.evaluate(el=>getComputedStyle(el).backgroundPosition)).toBe('100% 100%');
 await face.evaluate(el=>el.classList.remove('mouth-open'));
 await page.screenshot({path:'artifacts/expression-empathetic.png'});
 await reaction(page,'user','Thanks, everything is perfect now');
 await expect(face).toHaveAttribute('data-expression','cheerful');
 await page.screenshot({path:'artifacts/expression-cheerful.png'});
 await page.click('#resetBtn');await expect(face).toHaveAttribute('data-expression','neutral');
});

test('live transcript, interruption and reduced motion retain appropriate expressions', async({page})=>{
 await setup(page);const face=page.locator('#guideArt');
 await page.evaluate(()=>document.getElementById('gatorStage').dataset.state='listening');
 await expect(face).toHaveAttribute('data-expression','curious');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('voice-message',{detail:{role:'user',text:'I have a serious problem with my room'}})));
 await expect(face).toHaveAttribute('data-expression','empathetic');
 await page.evaluate(()=>{document.getElementById('gatorStage').dataset.state='speaking';document.dispatchEvent(new CustomEvent('call-reply',{detail:{reply:'I am sorry. Please contact staff.'}}));});
 await expect(face).toHaveAttribute('data-expression','empathetic');
 await page.emulateMedia({reducedMotion:'reduce'});
 await face.evaluate(el=>el.classList.add('mouth-open','blinking'));
 expect(await face.evaluate(el=>getComputedStyle(el).backgroundPosition)).toBe('100% 100%');
 await page.evaluate(()=>document.getElementById('gatorStage').dataset.state='listening');
 await expect(face).toHaveAttribute('data-expression','empathetic');
 await page.setViewportSize({width:390,height:844});
 await page.click('#closeChatDrawer');
 await expect(face).toBeVisible();
 await page.screenshot({path:'artifacts/expression-mobile.png'});
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('call-active',{detail:false})));
 await expect(face).toHaveAttribute('data-expression','neutral');
});
