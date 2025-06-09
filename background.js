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
                    // Send tab data to content script with error handling
                    chrome.tabs.sendMessage(currentTab.id, {
                        action: 'show-tab-switcher',
                        tabs: allTabs,
                        currentTabId: currentTab.id
                    }).catch(error => {
                        console.log('Tab Switcher: Could not send message to content script. Page may not be ready.');
                    });
                });
            }
        });
    }
});

// Listen for tab switch requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'switch-to-tab') {
        chrome.tabs.update(request.tabId, { active: true })
            .then(() => {
                sendResponse({ success: true });
            })
            .catch(error => {
                console.log('Tab Switcher: Failed to switch tab:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open for async response
    }
});