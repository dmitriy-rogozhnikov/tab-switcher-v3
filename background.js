// Background script for Tab Switcher extension

// Listen for keyboard command
chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-tab-switcher') {
        // Get current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const currentTab = tabs[0];

                // Get all tabs in current window
                chrome.tabs.query({ currentWindow: true }, (allTabs) => {
                    // Send tab data to content script
                    chrome.tabs.sendMessage(currentTab.id, {
                        action: 'show-tab-switcher',
                        tabs: allTabs,
                        currentTabId: currentTab.id
                    });
                });
            }
        });
    }
});

// Listen for tab switch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'switch-to-tab') {
        chrome.tabs.update(request.tabId, { active: true }, () => {
            sendResponse({ success: true });
        });
        return true; // Keep message channel open for async response
    }
});