// Content script for Tab Switcher overlay

class TabSwitcher {
    constructor() {
        this.overlay = null;
        this.tabs = [];
        this.filteredTabs = [];
        this.currentTabId = null;
        this.selectedIndex = 0;
        this.isActive = false; // prevent multiple overlays on different tabs
        this.searchInput = null;
        this.tabList = null;

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'show-tab-switcher') {
                this.showOverlay(request.tabs, request.currentTabId);
            }
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'renew-tab-switcher') {
                this.tabs = request.tabs;
            }
        });
    }

    showOverlay(tabs, currentTabId) {
        if (this.isActive) return; // Prevent multiple overlays

        this.tabs = tabs;
        this.filteredTabs = tabs; // Initially show all tabs
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

        // Create main container
        const container = document.createElement('div');
        container.className = 'tab-switcher-container';

        // Create search input
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search tabs...';
        this.searchInput.className = 'tab-switcher-search';
        container.appendChild(this.searchInput);

        // Create tab list container
        this.tabList = document.createElement('div');
        this.tabList.className = 'tab-switcher-list';

        this.renderTabList();

        container.appendChild(this.tabList);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        // Focus search input
        this.searchInput.focus();
    }

    renderTabList() {
        // Clear existing items
        this.tabList.innerHTML = '';

        // Create tab items for filtered tabs
        this.filteredTabs.forEach((tab, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-switcher-item';
            tabItem.dataset.index = index;

            // Add selected class to selected tab
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


            // what title?
            // Create title
            const title = document.createElement('span');
            title.className = 'tab-switcher-title';
            title.textContent = tab.title || 'Untitled';

            tabItem.appendChild(favicon);
            tabItem.appendChild(title);
            this.tabList.appendChild(tabItem);
        });

        // Clear cached items since we rebuilt the list
        this.cachedItems = null;
    }

    attachEventListeners() {
        this.keydownHandler = (e) => this.handleKeydown(e);
        this.inputHandler = (e) => this.handleSearch(e);

        document.addEventListener('keydown', this.keydownHandler, true);
        this.searchInput.addEventListener('input', this.inputHandler);
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();

        if (query === '') {
            // Show all tabs if search is empty
            this.filteredTabs = this.tabs;
        } else {
            // Filter tabs by title and URL
            this.filteredTabs = this.tabs.filter(tab => {
                const title = (tab.title || '').toLowerCase();
                const url = (tab.url || '').toLowerCase();
                return title.includes(query) || url.includes(query);
            });
        }

        // Always select first item after filtering
        this.selectedIndex = 0;

        // Re-render the tab list
        this.renderTabList();
    }

    handleKeydown(e) {
        if (!this.isActive) return;

        // Only prevent default for keys we handle
        const handledKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Ctrl+Backspace'];
        if (handledKeys.includes(e.key)) {
            e.preventDefault();
            e.stopImmediatePropagation(); // Stop all other handlers
        }

        // Handle key repeat for faster navigation
        if (e.metaKey && e.key === 'Backspace') {
            this.closeSelectedTab();
            const oldIndex = this.selectedIndex;
            this.moveSelection(1);
            this.removeTabFromList(oldIndex);
            this.renderTabList();
        } else {
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
    }

    moveSelection(direction) {
        const oldIndex = this.selectedIndex;
        this.selectedIndex += direction;

        // Wrap around selection based on filtered tabs
        if (this.selectedIndex < 0) {
            this.selectedIndex = this.filteredTabs.length - 1;
        } else if (this.selectedIndex >= this.filteredTabs.length) {
            this.selectedIndex = 0;
        }

        // Update visual selection
        this.updateSelection(oldIndex, this.selectedIndex);
    }

    updateSelection(oldIndex, newIndex) {
        // Cache items array to avoid repeated DOM queries
        if (!this.cachedItems) {
            this.cachedItems = this.overlay.querySelectorAll('.tab-switcher-item');
        }

        // Batch DOM updates for better performance
        if (this.cachedItems[oldIndex]) {
            this.cachedItems[oldIndex].classList.remove('selected');
        }

        if (this.cachedItems[newIndex]) {
            this.cachedItems[newIndex].classList.add('selected');
        }

        // Skip scrollIntoView for now to test if that's causing the slowness
        this.cachedItems[newIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'auto'
        });
    }

    switchToSelectedTab() {
        const selectedTab = this.filteredTabs[this.selectedIndex];
        if (selectedTab) {
            this.closeOverlay();

            // Send message to background script to switch tab with error handling
            chrome.runtime.sendMessage({
                action: 'switch-to-tab',
                tabId: selectedTab.id
            }).catch(error => {
                console.log('Tab Switcher: Message sending failed, but tab switch may still work');
            });
        }
    }

    closeOverlay() {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
            this.cachedItems = null;
            this.searchInput = null;
            this.tabList = null;
        }

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
            this.keydownHandler = null;
        }

        if (this.inputHandler) {
            this.inputHandler = null;
        }

        this.isActive = false;
    }

    closeSelectedTab() {
        const selectedTab = this.filteredTabs[this.selectedIndex];
        if (selectedTab) {
            chrome.runtime.sendMessage({
                action: "close-tab-by-id",
                tabId: selectedTab.id
            });
        }
    }

    removeTabFromList(oldIndex) {
        this.tabs.splice(oldIndex, 1);
    }
}

// Initialize tab switcher when content script loads
const tabSwitcher = new TabSwitcher();