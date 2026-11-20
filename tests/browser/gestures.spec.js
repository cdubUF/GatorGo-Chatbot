import {test,expect} from '@playwright/test';
test('hands gesture while speaking, greet on tap, and respect reduced motion',async({page})=>{
 await page.goto('/');await page.click('#continueGator');await page.click('#focusView');
 await page.evaluate(()=>document.getElementById('gatorStage').dataset.state='speaking');
 await expect(page.locator('.gesture-rig')).toHaveAttribute('data-speaking','true');
 const hand=page.locator('.gesture-right');const before=await hand.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(700);expect(await hand.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
 await page.screenshot({path:'artifacts/hand-gestures-desktop.png'});
 await page.evaluate(()=>document.getElementById('gatorStage').dataset.state='idle');await page.locator('#gatorStage').focus();await page.keyboard.press('Enter');await expect(page.locator('.gesture-rig')).toHaveClass(/gesture-greeting/);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await hand.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/hand-gestures-phone.png'});
});
