from pathlib import Path
import json
from playwright.sync_api import sync_playwright

base=Path(__file__).resolve().parent
print('Starting headless render',flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True,timeout=20000)
    page=browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
    page.goto((base/'preview.html').as_uri(),wait_until='load',timeout=45000)
    page.wait_for_function('Array.from(document.images).every(i=>i.complete)',timeout=20000)
    try:
        page.wait_for_function('window.MathJax && window.MathJax.startup && window.MathJax.startup.document',timeout=20000)
        page.evaluate('async()=>{await MathJax.startup.promise}')
    except Exception:
        page.add_script_tag(url='https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.js')
        page.wait_for_function('window.MathJax && window.MathJax.startup && window.MathJax.startup.document',timeout=30000)
        page.evaluate('async()=>{await MathJax.startup.promise; await MathJax.typesetPromise()}')
    page.wait_for_function('document.querySelectorAll("mjx-container").length > 0',timeout=20000)
    result=page.evaluate('''()=>({images:document.images.length,brokenImages:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.getAttribute('src')),tables:document.querySelectorAll('table').length,mathRendered:document.querySelectorAll('mjx-container').length,mathErrors:[...document.querySelectorAll('mjx-merror')].map(e=>e.textContent),bodyScrollWidth:document.body.scrollWidth,viewport:innerWidth})''')
    page.screenshot(path=str(base/'review-top.png'))
    for anchor,name in [('chapter-1','review-chapter1'),('chapter-3','review-chapter3'),('chapter-5','review-chapter5'),('chapter-6','review-chapter6'),('appendix','review-appendix')]:
        page.locator(f'#{anchor}').scroll_into_view_if_needed()
        page.screenshot(path=str(base/f'{name}.png'))
    # Capture actual formula/table-rich areas, beyond chapter headers.
    for label,name in [('3.7 Scale','review-quant-math'),('6.6 Weight-only','review-gptq-math')]:
        loc=page.get_by_role('heading',name=label,exact=False).first
        loc.scroll_into_view_if_needed()
        page.evaluate('window.scrollBy(0,650)')
        page.wait_for_timeout(250)
        page.screenshot(path=str(base/f'{name}.png'))
    math=page.locator('mjx-container[display="true"]').first
    if math.count(): math.screenshot(path=str(base/'review-rendered-formula.png'))
    table=page.locator('table').nth(20)
    if table.count(): table.screenshot(path=str(base/'review-rendered-table.png'))
    page.get_by_role('heading',name='한눈에 보는 Linear / Nonlinear',exact=False).scroll_into_view_if_needed()
    page.evaluate('window.scrollBy(0,350)')
    page.screenshot(path=str(base/'review-taxonomy.png'))
    (base/'render-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False),flush=True)
    browser.close()
