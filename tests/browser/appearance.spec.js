import {test,expect} from '@playwright/test';
async function open(page){await page.goto('/');await page.click('#continueGator');}
test('appearance themes and modes persist and system changes live',async({page})=>{
 await page.goto('/');await page.locator('.welcome-nav').getByRole('button',{name:'Settings',exact:true}).click();
 for(const theme of ['lagoon','palm-house','coastal-deco']){
  await page.click(`[data-theme-choice=${theme}]`);await expect(page.locator('body')).toHaveAttribute('data-theme',theme);await expect(page.locator(`[data-theme-choice=${theme}]`)).toHaveAttribute('aria-pressed','true');
 }
 await page.click('[data-mode-choice=dark]');await page.reload();await expect(page.locator('body')).toHaveAttribute('data-theme','coastal-deco');await expect(page.locator('body')).toHaveAttribute('data-color-mode','dark');
 await page.locator('.welcome-nav').getByRole('button',{name:'Settings',exact:true}).click();await page.click('[data-mode-choice=system]');await page.emulateMedia({colorScheme:'light'});await expect(page.locator('body')).toHaveAttribute('data-color-mode','light');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('body')).toHaveAttribute('data-color-mode','dark');
 await page.locator('[data-theme-choice=palm-house]').focus();await page.keyboard.press('Enter');await expect(page.locator('body')).toHaveAttribute('data-theme','palm-house');
});
test('map detail selection and settings preserve conversation and draft',async({page})=>{
 await open(page);await page.fill('#messageInput','Preserved draft');await page.click('#mapOpen');await page.click('[data-venue=palm-grill]');await expect(page.locator('.map-detail h3')).toHaveText('Palm Grill');await expect(page.locator('.map-photo')).toHaveAttribute('data-venue','palm-grill');
 await page.click('[data-venue=blue-heron]');await expect(page.locator('.map-detail h3')).toHaveText('Blue Heron Cafe');await expect(page.locator('.map-photo')).toHaveAttribute('data-venue','blue-heron');await expect(page.locator('[data-venue=blue-heron].map-pin')).toHaveAttribute('aria-pressed','true');
 await page.locator('#resortDialog').getByRole('button',{name:'Settings',exact:true}).click();await page.click('[data-mode-choice=dark]');await page.click('#closeAppearance');await expect(page.locator('.map-detail h3')).toHaveText('Blue Heron Cafe');await page.click('#closeResort');await expect(page.locator('#messageInput')).toHaveValue('Preserved draft');
});
test('spoken entries deduplicate and remain ordered when input transcription is late',async({page})=>{
 await open(page);await page.fill('#messageInput','Still typing');
 await page.evaluate(()=>{for(const [role,text] of [['agent','Palm Grill is on the east terrace.'],['user','Where is Palm Grill?'],['agent','Palm Grill is on the east terrace.']])document.dispatchEvent(new CustomEvent('voice-message',{detail:{id:'test-turn',role,text}}));});
 await expect(page.locator('[data-voice-turn=test-turn]')).toHaveCount(2);await expect(page.locator('[data-voice-turn=test-turn]').first()).toHaveClass('message user');await expect(page.locator('#messageInput')).toHaveValue('Still typing');await page.getByRole('button',{name:'Show on map: Palm Grill',exact:true}).click();await expect(page.locator('.map-detail h3')).toHaveText('Palm Grill');
});
for(const theme of ['lagoon','palm-house','coastal-deco'])for(const mode of ['light','dark'])test(`phone ${theme} ${mode} keeps settings map and composer reachable`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await page.click('#settingsOpen');await page.click(`[data-theme-choice=${theme}]`);await page.click(`[data-mode-choice=${mode}]`);await expect(page.locator('[data-mode-choice=system]')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.click('#closeAppearance');await page.click('#mapOpen');await page.click('[data-venue=palm-grill]');await page.locator('.map-ask').scrollIntoViewIfNeeded();await expect(page.locator('.map-ask')).toBeInViewport();await page.click('#closeResort');await page.click('#chatDrawerToggle');await page.fill('#messageInput','Hello');await expect(page.locator('#messageInput')).toBeInViewport();await expect(page.locator('#liveTalk')).toBeInViewport();
});

test('map Ask Gator preserves prior turns and establishes the venue for followups',async({page})=>{
 await open(page);await page.locator('#conversationOptions').evaluate(el=>el.open=true);await page.uncheck('#speakReplies');await page.fill('#messageInput','When is check-in?');await page.press('#messageInput','Enter');await expect(page.locator('.message.agent').last()).toContainText('3:00');
 await page.click('#mapOpen');await page.click('.map-pin[data-venue=palm-grill]');await page.click('.map-ask');await expect(page.locator('.message.user')).toHaveCount(2);await expect(page.locator('.message.agent').last()).toContainText('Palm Grill');
 await page.fill('#messageInput','What time does it open?');await page.press('#messageInput','Enter');await expect(page.locator('.message.user')).toHaveCount(3);await expect(page.locator('.message.agent').last()).toContainText('11:00');await expect(page.locator('.message.user').first()).toContainText('check-in');
});
