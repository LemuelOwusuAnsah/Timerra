(function() {
    function exportEvents(events) {
        if (!events || events.length === 0) {
            alert('No events to export. Create some events first.');
            return;
        }

        try {
            var data = JSON.stringify(events, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            var date = new Date().toISOString().slice(0, 10);
            
            a.href = url;
            a.download = 'timerra-events-backup-' + date + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Events exported successfully!');
        } catch (e) {
            alert('Failed to export events: ' + e.message);
        }
    }

    function importEvents(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    var imported = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(imported)) {
                        reject('Invalid format: expected an array of events.');
                        return;
                    }
                    
                    if (imported.length === 0) {
                        reject('The file contains no events.');
                        return;
                    }
                    
                    // Validate each event has required fields
                    var valid = true;
                    imported.forEach(function(event) {
                        if (!event.id || !event.name || !event.date) {
                            valid = false;
                        }
                    });
                    
                    if (!valid) {
                        reject('Invalid format: some events are missing required fields (id, name, date).');
                        return;
                    }
                    
                    resolve(imported);
                } catch (err) {
                    reject('Invalid JSON file: ' + err.message);
                }
            };
            
            reader.onerror = function() {
                reject('Failed to read file.');
            };
            
            reader.readAsText(file);
        });
    }

    function importFromFile() {
        var input = document.getElementById('importFile');
        if (!input) {
            // Create hidden file input if not exists
            input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.id = 'importFile';
            input.style.display = 'none';
            document.body.appendChild(input);
        }
        
        input.click();
        
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            importEvents(file).then(function(imported) {
                var count = imported.length;
                var confirmMsg = 'Found ' + count + ' event' + (count > 1 ? 's' : '') + ' in the file.';
                confirmMsg += '\n\nDo you want to add them to your existing events?';
                confirmMsg += '\n(Select Cancel to discard the import.)';
                
                if (confirm(confirmMsg)) {
                    return imported;
                } else {
                    throw new Error('Import cancelled by user.');
                }
            }).then(function(imported) {
                // Merge with existing events
                var existingIds = window.TimerraEvents ? window.TimerraEvents.getEvents().map(function(e) { return e.id; }) : [];
                var newEvents = imported.filter(function(e) {
                    return !existingIds.includes(e.id);
                });
                
                if (newEvents.length === 0) {
                    alert('All events in the file already exist in your list.');
                    return;
                }
                
                if (window.TimerraEvents) {
                    window.TimerraEvents.addEvents(newEvents);
                    alert('Successfully imported ' + newEvents.length + ' event' + (newEvents.length > 1 ? 's' : '') + '!');
                } else {
                    alert('TimerraEvents not found. Please refresh the page and try again.');
                }
            }).catch(function(err) {
                if (err !== 'Import cancelled by user.') {
                    alert('Import failed: ' + err);
                }
            });
            
            input.value = '';
        };
    }

    function clearAllEvents() {
        if (!window.TimerraEvents) {
            alert('TimerraEvents not found. Please refresh the page and try again.');
            return;
        }
        
        var count = window.TimerraEvents.getEvents().length;
        if (count === 0) {
            alert('No events to clear.');
            return;
        }
        
        if (confirm('Are you sure you want to delete all ' + count + ' event' + (count > 1 ? 's' : '') + '? This cannot be undone.')) {
            if (confirm('Really? This will permanently delete all your events.')) {
                window.TimerraEvents.clearAll();
                alert('All events have been deleted.');
            }
        }
    }

    window.TimerraExport = {
        exportEvents: exportEvents,
        importEvents: importEvents,
        importFromFile: importFromFile,
        clearAllEvents: clearAllEvents
    };
})();