import {test,expect} from '@playwright/test';
test('chat and focus controls preserve draft and restore layout',async({page})=>{
 await page.goto('/');await page.click('#continueGator');await page.fill('#messageInput','Keep my draft');
 await page.click('#chatDrawerToggle');await expect(page.locator('#chatDrawer')).toBeHidden();await expect(page.locator('#chatDrawerToggle')).toHaveText('Show sidebar');
 await page.click('#chatDrawerToggle');await expect(page.locator('#messageInput')).toHaveValue('Keep my draft');
 await page.click('#focusView');await expect(page.locator('.topbar')).toBeHidden();await expect(page.locator('#chatDrawer')).toBeHidden();
 await page.click('#chatDrawerToggle');await expect(page.locator('#messageInput')).toHaveValue('Keep my draft');await page.keyboard.press('Escape');
 await expect(page.locator('body')).not.toHaveClass(/focus-view/);await expect(page.locator('#messageInput')).toHaveValue('Keep my draft');
 await page.click('#conversationOptions summary');await expect(page.locator('#cameraToggle')).toBeVisible();
});
test('popout opens independent focused concierge without starting microphone',async({page})=>{
 await page.goto('/');await page.click('#continueGator');const next=page.waitForEvent('popup');await page.click('#popoutView');const popup=await next;await popup.waitForLoadState();
 await expect(popup.locator('#gatorPicker')).toBeHidden();await expect(popup.locator('body')).toHaveClass(/focus-view/);await expect(popup.locator('#liveTalk')).toHaveAttribute('aria-pressed','false');await expect(popup.locator('#popoutView')).toBeHidden();await popup.close();
});
for(const width of [390,1440])test(`stage controls fit ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.click('#continueGator');
 await expect(page.locator('#focusView')).toBeInViewport();await expect(page.locator('#liveTalk')).toBeInViewport();await page.click('#focusView');await expect(page.locator('#fullscreenView')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/focus-stage-${width}.png`});
});
test('browser fullscreen can be entered and exited',async({page})=>{
 await page.goto('/');await page.click('#continueGator');await page.click('#fullscreenView');
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await expect(page.locator('#fullscreenView')).toHaveText('Exit full screen');await page.click('#fullscreenView');
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 await page.click('#focusView');await expect(page.locator('.topbar')).toBeVisible();
});

test('popout notice dismisses manually and expires automatically',async({page})=>{
 await page.goto('/?view=popout');await expect(page.locator('#viewNotice')).toBeVisible();
 await page.getByRole('button',{name:'Dismiss notification'}).click();await expect(page.locator('#viewNotice')).toBeHidden();
 await page.reload();await expect(page.locator('#viewNotice')).toBeVisible();await expect(page.locator('#viewNotice')).toBeHidden({timeout:7000});
});
test('blocked popup notification also expires',async({page})=>{
 await page.goto('/');await page.click('#continueGator');await page.evaluate(()=>window.open=()=>null);await page.click('#popoutView');
 await expect(page.locator('#viewNotice')).toContainText('blocked');await expect(page.locator('#viewNotice')).toBeHidden({timeout:7000});
});

for(const width of [390,1440])test(`sidebar header and stage toggles stay synchronized at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.click('#continueGator');await page.click('#sidebarToggle');
 const open=await page.locator('#sidebarToggle').getAttribute('aria-expanded');await expect(page.locator('#chatDrawerToggle')).toHaveAttribute('aria-expanded',open);
 await page.click('#sidebarToggle');await page.click('#sidebarToggle');
 if(await page.locator('#sidebarToggle').getAttribute('aria-expanded')==='false')await page.click('#sidebarToggle');
 await page.fill('#messageInput','Keep this draft');await page.click('#sidebarToggle');await expect(page.locator('#chatDrawer')).toBeHidden();
 await page.click('#chatDrawerToggle');await expect(page.locator('#messageInput')).toHaveValue('Keep this draft');await expect(page.locator('#sidebarToggle')).toHaveText('Hide sidebar');
 await page.click('#closeChatDrawer');await expect(page.locator('#sidebarToggle')).toHaveText('Show sidebar');
});
