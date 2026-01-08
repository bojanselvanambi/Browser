# A Trails based Browser

Trails: Browse Like Your Brain Thinks

Automatic Branching: Click any link → it becomes a child trail (nested under the current page), preserving context for rabbit holes.

Sidebar-Driven Navigation: No back/forward buttons needed. Click any trail in the sidebar to jump there instantly. "Go back" by clicking the parent.

Full Flexibility with Drag-and-Drop:
Drag to the middle of a trail → nest it as a child (sub-trail).
Drag to the top/bottom edge → reorder as siblings.
Drag out to root/drop zone → detach and make independent.
Move entire branches or multi-selected trails effortlessly.

Persistence: Everything auto-saves — reopen the app and your exact hierarchy restores.

🖤 Zen Mode Aesthetic

Pure black theme with Vercetti font for a calm, distraction-free experience.
Hidden window controls and minimal UI — the sidebar is your browser.
Optimized for 60fps smoothness even with hundreds of trails (React.memo + Context API).

🔧 Core Functionality

Full web browsing via integrated BrowserView.
Smart Omnibox: Rename a trail to navigate (type URL or search query).
Favicon support with reliable fallbacks (Vemetric + Google services).
Basic history, downloads, and context menus (copy link, new sub-trail, etc.).
