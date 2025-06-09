// Content script for Tab Switcher overlay

class TabSwitcher {
    constructor() {
        this.overlay = null;
        this.tabs = [];
        this.currentTabId = null;
        this.selectedIndex = 0;
        this.isActive = false;

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'show-tab-switcher') {
                this.showOverlay(request.tabs, request.currentTabId);
            }
        });
    }

    showOverlay(tabs, currentTabId) {
        if (this.isActive) return; // Prevent multiple overlays

        this.tabs = tabs;
        this.currentTabId = currentTabId;
        this.selectedIndex = tabs.findIndex(tab => tab.id === currentTabId);
        this.isActive = true;

        this.createOverlay();
        this.attachEventListeners();
    }

    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'tab-switcher-overlay';
        this.overlay.className = 'tab-switcher-overlay';

        // Create tab list container
        const tabList = document.createElement('div');
        tabList.className = 'tab-switcher-list';

        // Create tab items
        this.tabs.forEach((tab, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-switcher-item';
            tabItem.dataset.index = index;

            // Add selected class to current tab
            if (index === this.selectedIndex) {
                tabItem.classList.add('selected');
            }

            // Create favicon
            const favicon = document.createElement('img');
            favicon.src = tab.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
            favicon.className = 'tab-switcher-favicon';
            favicon.onerror = () => {
                favicon.style.display = 'none';
            };

            // Create title
            const title = document.createElement('span');
            title.className = 'tab-switcher-title';
            title.textContent = tab.title || 'Untitled';

            tabItem.appendChild(favicon);
            tabItem.appendChild(title);
            tabList.appendChild(tabItem);
        });

        this.overlay.appendChild(tabList);
        document.body.appendChild(this.overlay);

        // Focus overlay for keyboard events
        this.overlay.focus();
    }

    attachEventListeners() {
        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener('keydown', this.keydownHandler, true);
    }

    handleKeydown(e) {
        if (!this.isActive) return;

        // Prevent default behavior for all keys while overlay is active
        e.preventDefault();
        e.stopPropagation();

        switch (e.key) {
            case 'ArrowUp':
                this.moveSelection(-1);
                break;
            case 'ArrowDown':
                this.moveSelection(1);
                break;
            case 'Enter':
                this.switchToSelectedTab();
                break;
            case 'Escape':
                this.closeOverlay();
                break;
        }
    }

    moveSelection(direction) {
        const oldIndex = this.selectedIndex;
        this.selectedIndex += direction;

        // Wrap around selection
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.tabs.length - 1;
        } else if (this.selectedIndex >= this.tabs.length) {
            this.selectedIndex = 0;
        }

        // Update visual selection
        this.updateSelection(oldIndex, this.selectedIndex);
    }

    updateSelection(oldIndex, newIndex) {
        const items = this.overlay.querySelectorAll('.tab-switcher-item');

        if (items[oldIndex]) {
            items[oldIndex].classList.remove('selected');
        }

        if (items[newIndex]) {
            items[newIndex].classList.add('selected');
            // Scroll selected item into view
            items[newIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    switchToSelectedTab() {
        const selectedTab = this.tabs[this.selectedIndex];
        if (selectedTab) {
            this.closeOverlay();

            // Send message to background script to switch tab
            chrome.runtime.sendMessage({
                action: 'switch-to-tab',
                tabId: selectedTab.id
            });
        }
    }

    closeOverlay() {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
        }

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
            this.keydownHandler = null;
        }

        this.isActive = false;
    }
}

// Initialize tab switcher when content script loads
const tabSwitcher = new TabSwitcher();