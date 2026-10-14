"""
Diagnostic: drive GUO's real booking UI in headless Chromium and confirm the search
still goes through POST /itinerary (the endpoint server/guo/client.ts replays with
plain HTTP). Run this if the scraper starts failing, to see what GUO's frontend
does now.

    pip install playwright && playwright install chromium
    python scripts/guo_ui_check.py          # Jibowu -> Abuja, 7 days out

Not used in production: the app itself never launches a browser.
"""
import asyncio, json, datetime, os
from playwright.async_api import async_playwright
EXE=os.environ.get("CHROMIUM_PATH")  # None = Playwright's bundled Chromium
DATE=(datetime.date.today()+datetime.timedelta(days=7)).isoformat()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=EXE or None,headless=True,args=["--no-sandbox"])
        page=await (await b.new_context()).new_page()
        cap={}
        async def on_resp(r):
            if r.request.method=="POST" and "guotransport.com" in r.url and "analytics" not in r.url:
                t=await r.text() if r.status!=302 else ""
                print("POST",r.status,r.url,"\n  req:",r.request.post_data,"\n  resp:",t[:200])
                if r.url.endswith("/itinerary"): cap["itin"]=json.loads(t)
        page.on("response",on_resp)
        await page.goto("https://guotransport.com/",wait_until="networkidle",timeout=90000)
        await page.wait_for_timeout(1500)
        await page.evaluate("()=>{document.querySelectorAll('#showFraudAlert,.modal-backdrop,.js-cookie-consent').forEach(e=>e.remove());document.body.classList.remove('modal-open');document.body.style.overflow='auto'}")
        # TomSelect (not select2): open control, type, pick option
        await page.click("#tomselect-1-ts-control, .ts-control >> nth=0")
        await page.keyboard.type("JIBOWU")
        await page.click(".ts-dropdown .option:has-text('JIBOWU')")
        await page.wait_for_timeout(500)
        await page.locator(".ts-control").nth(1).click()
        await page.keyboard.type("ABUJA")
        await page.locator(".ts-dropdown .option:has-text('ABUJA')").first.click()
        # Litepicker date input is readonly; set the store directly like the picker's 'selected' handler does
        await page.evaluate("d=>{const app=document.querySelector('#app').__vue_app__;app.config.globalProperties.$store.state.booking.selectedTripDate=d;document.getElementById('ddate').value=d}",DATE)
        st=await page.evaluate("()=>JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$store.state.booking,['selectedTerminal','selectedDestination','selectedTripDate','one_way'])")
        print("store",st)
        await page.get_by_role("button",name="Search").or_(page.locator("button:has-text('Search'),button:has-text('Book')")).first.click()
        await page.wait_for_url("**/booking_result",timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path="guo_result.png",full_page=True)
        bl=cap["itin"]["schedule"]["BusList"]
        print("UI flow captured",len(bl),"buses:",[(x["VehicleGroupTag_Name"],x["FareAmount"]) for x in bl])
        await b.close()
asyncio.run(main())
