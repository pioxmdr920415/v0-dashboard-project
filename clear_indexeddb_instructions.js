// This script needs to be run in a browser context
    // To clear IndexedDB, you can:
    // 1. Open Chrome DevTools (F12)
    // 2. Go to Application > Storage > IndexedDB
    // 3. Right-click and delete the MDRRMODashboard database
    // 4. Or run this in console:
    
    indexedDB.databases().then(databases => {
        databases.forEach(db => {
            if (db.name === 'MDRRMODashboard') {
                console.log('Found MDRRMODashboard database, deleting...');
                const request = indexedDB.deleteDatabase(db.name);
                request.onsuccess = () => console.log('IndexedDB cleared successfully');
                request.onerror = () => console.error('Error clearing IndexedDB');
            }
        });
    });
