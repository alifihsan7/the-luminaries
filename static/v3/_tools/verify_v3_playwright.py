import asyncio
import os
import sys
import subprocess
import time
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    print("Memulai verifikasi visual dan fungsional Playwright Konsol v3...")
    port = 8766
    env = os.environ.copy()
    env["PORT"] = str(port)
    
    repo_dir = Path(__file__).resolve().parents[3]
    uvicorn_bin = str(repo_dir / ".venv" / "bin" / "uvicorn")
    server_cmd = [uvicorn_bin if os.path.exists(uvicorn_bin) else "uvicorn", "app:app", "--port", str(port), "--host", "127.0.0.1"]

    server_proc = subprocess.Popen(
        server_cmd,
        cwd=str(repo_dir),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    await asyncio.sleep(2)
    
    errors = []
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900}
            )
            page = await context.new_page()
            
            # Listen to page errors
            page.on("pageerror", lambda err: errors.append(f"PageError: {err}"))
            page.on("console", lambda msg: errors.append(f"ConsoleError: {msg.text}") if msg.type == "error" else None)
            
            url = f"http://127.0.0.1:{port}/v3/"
            print(f"1. Navigasi ke {url}...")
            await page.goto(url, wait_until="networkidle")
            
            # Verify Overview is active by default
            overview_el = page.locator("#view-overview")
            assert await overview_el.is_visible(), "Overview view should be visible by default"
            
            # Check clock elements
            live_clock_el = page.locator("#live-clock-text")
            sync_ago_el = page.locator("#last-sync-display")
            
            clock_text_1 = await live_clock_el.inner_text()
            print(f"   Initial Live Clock: {clock_text_1}")
            assert "WIB" in clock_text_1, "Clock text must contain WIB"
            
            await asyncio.sleep(1.2)
            clock_text_2 = await live_clock_el.inner_text()
            print(f"   Ticked Live Clock: {clock_text_2}")
            
            sync_text = await sync_ago_el.inner_text()
            print(f"   Sync Ago Display: {sync_text}")
            assert "Synced:" in sync_text, "Sync display must contain 'Synced:'"
            
            # 2. Test View Routing via Sidebar Navigation
            print("2. Menguji View Routing...")
            # Click Incidents Nav
            await page.locator('[data-nav="incidents"]').click()
            await asyncio.sleep(0.3)
            assert await page.locator("#view-incidents").is_visible(), "Incidents view must be visible"
            assert not await page.locator("#view-overview").is_visible(), "Overview view must be hidden"
            title_text = await page.locator("#page-title").inner_text()
            print(f"   Page Title after switching to Incidents: {title_text}")
            assert "INCIDENTS" in title_text, f"Title should have INCIDENTS, got {title_text}"
            assert "#/incidents" in page.url, f"URL hash should be #/incidents, got {page.url}"
            
            # Click Topology Nav
            await page.locator('[data-nav="topology"]').click()
            await asyncio.sleep(0.3)
            assert await page.locator("#view-topology").is_visible(), "Topology view must be visible"
            title_text = await page.locator("#page-title").inner_text()
            assert "TOPOLOGY" in title_text, f"Title should have TOPOLOGY, got {title_text}"
            
            # Click Task Stream Nav
            await page.locator('[data-nav="stream"]').click()
            await asyncio.sleep(0.3)
            assert await page.locator("#view-stream").is_visible(), "Stream view must be visible"
            title_text = await page.locator("#page-title").inner_text()
            assert "TASK STREAM" in title_text, f"Title should have TASK STREAM, got {title_text}"
            
            # 3. Test Task Stream Pagination & Agent Filter
            print("3. Menguji Task Stream Filter & Pagination...")
            agent_filter = page.locator("#stream-agent-filter")
            await agent_filter.select_option("daemon")
            await asyncio.sleep(0.3)
            
            range_text = await page.locator("#pagination-range-text").inner_text()
            print(f"   Pagination range text for filter 'daemon': {range_text}")
            
            # Reset filter back to 'ALL'
            await agent_filter.select_option("ALL")
            await asyncio.sleep(0.3)
            range_text_all = await page.locator("#pagination-range-text").inner_text()
            page_info = await page.locator("#task-page-info").inner_text()
            print(f"   Pagination with 'all': {range_text_all} | {page_info}")
            
            # Test Prev / Next button state
            prev_btn = page.locator("#task-page-prev")
            next_btn = page.locator("#task-page-next")
            assert await prev_btn.is_disabled(), "Prev button should be disabled on page 1"
            assert not await next_btn.is_disabled(), "Next button should be enabled on page 1 with 67 tasks"
            
            # Click Next button
            await next_btn.click()
            await asyncio.sleep(0.3)
            page_info_p2 = await page.locator("#task-page-info").inner_text()
            range_text_p2 = await page.locator("#pagination-range-text").inner_text()
            print(f"   Pagination after Next click: {range_text_p2} | {page_info_p2}")
            assert "Page 2" in page_info_p2, f"Expected Page 2, got {page_info_p2}"
            assert not await prev_btn.is_disabled(), "Prev button should be enabled on page 2"
            
            # Click Prev button to return to page 1
            await prev_btn.click()
            await asyncio.sleep(0.3)
            page_info_p1 = await page.locator("#task-page-info").inner_text()
            assert "Page 1" in page_info_p1, f"Expected Page 1, got {page_info_p1}"
            
            # 4. Test Agent Detail Modal (Hero Task, Copy Intent, View in Task Stream)
            print("4. Menguji Agent Detail Modal & 1 Hero Task...")
            await page.locator('[data-nav="overview"]').click()
            await asyncio.sleep(0.3)
            
            iris_cell = page.locator('.agent-vital-cell[data-agent-id="iris"]')
            await iris_cell.wait_for(state="visible")
            await iris_cell.click()
            
            modal = page.locator("#agent-detail-modal")
            await modal.wait_for(state="visible")
            
            modal_title = await page.locator("#modal-agent-name").inner_text()
            modal_rank = await page.locator("#modal-agent-rank").inner_text()
            print(f"   Modal Agent Terbuka: {modal_title} ({modal_rank})")
            assert "Iris" in modal_title, f"Modal title should be Iris, got {modal_title}"
            
            # Check 1 Hero Task logic
            task_cards = page.locator(".agent-task-card")
            card_count = await task_cards.count()
            print(f"   Jumlah task card di modal (maksimal 1 hero task): {card_count}")
            assert card_count <= 1, f"Expected at most 1 hero task card, got {card_count}"
            
            # Verify Copy Intent button exists if a task is present
            if card_count == 1:
                copy_intent_btn = page.locator(".agent-task-intent-head .btn-copy")
                assert await copy_intent_btn.is_visible(), "Copy Intent button must be visible"
                print("   Tombol 'Copy Intent' terverifikasi hadir.")
            
            # Test "View in Task Stream →" button
            jump_btn = page.locator(".btn-jump-to-stream")
            await jump_btn.first.click()
            await asyncio.sleep(0.5)
            
            # Modal must be closed and Stream view must be active
            assert not await modal.is_visible(), "Modal should close after clicking View in Task Stream"
            assert await page.locator("#view-stream").is_visible(), "Task Stream view should become active"
            assert "#/stream" in page.url, f"URL hash should be #/stream, got {page.url}"
            selected_filter = await page.locator("#stream-agent-filter").input_value()
            print(f"   Filter dropdown agent setelah jump: '{selected_filter}'")
            assert selected_filter == "iris", f"Filter should be set to 'iris', got '{selected_filter}'"
            
            # 5. Capture artifacts
            os.makedirs("static/v3/_artifacts", exist_ok=True)
            await page.screenshot(path="static/v3/_artifacts/task_stream_filtered_iris.png")
            print("   Screenshot tersimpan: static/v3/_artifacts/task_stream_filtered_iris.png")
            
            # Check console errors
            assert len(errors) == 0, f"Found JavaScript errors on page: {errors}"
            print("   Nol error JavaScript di console.")
            
            await browser.close()
            print("Semua verifikasi Playwright sukses!")
            
    finally:
        server_proc.terminate()
        server_proc.wait()

if __name__ == "__main__":
    asyncio.run(main())
