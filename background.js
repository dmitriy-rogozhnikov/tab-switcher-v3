
let tabs = [];
let bookmarks = [];
let completedTasks = 0;
let currentTabId = null;

console.log('Background script loaded');

chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-tab-switcher') {
        console.log('Command triggered: open-tab-switcher'); // Log command trigger

        // Reset variables
        tabs = [];
        bookmarks = [];
        completedTasks = 0;
        currentTabId = null;

        // Get current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
            if (currentTabs.length > 0) {
                currentTabId = currentTabs[0].id;

                chrome.bookmarks.getTree((bookmarkTreeNodes) => {
                    const rootNode = bookmarkTreeNodes[0];
                    const allBookmarks = rootNode.children.find(node => node.title === 'Bookmarks' && !node.url);
                    const strFolder = allBookmarks.children.find(node => node.title === 'str' && !node.url);

                    bookmarks = strFolder
                        ? strFolder.children
                            .filter(node => node.url)
                            .map(bookmark => ({
                                title: bookmark.title,
                                url: bookmark.url
                            }))
                        : [];
                    completedTasks++;
                    sendResults();
                });

                // Get all tabs in current window
                chrome.tabs.query({ currentWindow: true }, (allTabs) => {
                    tabs = allTabs
                    completedTasks++;
                    sendResults();
                });

                // Get bookmarks from 'str' folder

            } else {
                console.log('Tab Switcher: No active tab found.');
            }
        });

        // Send results to content script when both tasks are complete
        function sendResults() {
            if (completedTasks === 2 && currentTabId !== null) {
                chrome.tabs.sendMessage(currentTabId, {
                    action: 'show-tab-switcher',
                    tabs: tabs,
                    bookmarks: bookmarks,
                    currentTabId: currentTabId
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Tab Switcher: Could not send message to content script:', chrome.runtime.lastError.message);
                    }
                });
            }
        }
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