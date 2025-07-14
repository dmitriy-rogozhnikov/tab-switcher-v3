// Background script for Tab Switcher extension

chrome.commands.onCommand.addListener((command) => {
    if (command === "do-something") {
        console.log("Command triggered:", command);
        // Add your logic here
    }
});

// Listen for the keyboard command
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-tab-switcher') {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Check if we're on a restricted page
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            // Create a temporary tab for the overlay
            const newTab = await chrome.tabs.create({
                url: chrome.runtime.getURL('overlay.html'),
                active: true
            });
            overlayTabId = newTab.id;
            return;
        }

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
        return true;
    }
    if(request.action === 'close-tab-by-id') {
        chrome.tabs.remove(request.tabId)
            .then(() => {
                sendResponse({success: true});
            })
            .catch(error => {
                console.log('Tab Switcher: Failed to close tab:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});