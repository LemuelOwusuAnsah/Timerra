(function() {
    var DOM = {
        eventName: document.getElementById('eventName'),
        eventDate: document.getElementById('eventDate'),
        addBtn: document.getElementById('addEventBtn'),
        eventsList: document.getElementById('eventsList'),
        eventsCount: document.getElementById('eventsCount'),
        activeCountdown: document.getElementById('activeCountdown'),
        themeToggle: document.getElementById('themeToggle'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        notifyBtn: document.getElementById('notifyBtn'),
        clearAllBtn: document.getElementById('clearAllBtn')
    };

    var events = [];
    var activeEventId = null;
    var countdownInterval = null;
    var notificationCheckInterval = null;
    var STORAGE_KEY = 'timerra_events';

    function loadEvents() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                events = JSON.parse(saved);
                renderEvents();
                if (events.length > 0) {
                    selectEvent(events[0].id);
                }
                checkUpcomingNotifications();
            }
        } catch (e) {}
    }

    function saveEvents() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
        } catch (e) {}
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function getTimeRemaining(targetDate) {
        var now = new Date().getTime();
        var target = new Date(targetDate).getTime();
        var diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { days: days, hours: hours, minutes: minutes, seconds: seconds, expired: false };
    }

    function getProgress(targetDate) {
        var now = new Date().getTime();
        var target = new Date(targetDate).getTime();
        var start = target - (30 * 24 * 60 * 60 * 1000);
        var total = target - start;
        var passed = now - start;
        return Math.min(100, Math.max(0, (passed / total) * 100));
    }

    function formatDate(dateStr) {
        var d = new Date(dateStr);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderEvents() {
        DOM.eventsList.innerHTML = '';
        if (events.length === 0) {
            DOM.eventsList.innerHTML = '<div class="empty-events">No events yet. Create your first countdown!</div>';
            DOM.eventsCount.textContent = '0 events';
            return;
        }

        DOM.eventsCount.textContent = events.length + ' event' + (events.length > 1 ? 's' : '');

        events.forEach(function(event) {
            var item = document.createElement('div');
            item.className = 'event-item' + (event.id === activeEventId ? ' active-event' : '');

            var info = document.createElement('div');
            info.className = 'event-info';

            var progress = getProgress(event.date);
            var remaining = getTimeRemaining(event.date);
            var timeStr = remaining.expired ? '🎉 Passed' : remaining.days + 'd ' + remaining.hours + 'h ' + remaining.minutes + 'm';

            info.innerHTML = `
                <span class="event-name">${escapeHtml(event.name)}</span>
                <span class="event-meta">${formatDate(event.date)} · ${timeStr}</span>
                <div class="event-progress-small">
                    <div class="fill" style="width:${progress}%"></div>
                </div>
            `;

            var actions = document.createElement('div');
            actions.className = 'event-actions';

            var selectBtn = document.createElement('button');
            selectBtn.className = 'event-select';
            selectBtn.textContent = event.id === activeEventId ? 'Active' : 'Select';
            selectBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                selectEvent(event.id);
            });
            if (event.id === activeEventId) {
                selectBtn.style.borderColor = 'var(--primary)';
                selectBtn.style.color = 'var(--primary)';
            }

            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'event-delete';
            deleteBtn.innerHTML = '<i class="bi bi-trash3"></i>';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteEvent(event.id);
            });

            actions.appendChild(selectBtn);
            actions.appendChild(deleteBtn);

            item.appendChild(info);
            item.appendChild(actions);

            item.addEventListener('click', function() {
                selectEvent(event.id);
            });

            DOM.eventsList.appendChild(item);
        });
    }

    function selectEvent(id) {
        activeEventId = id;
        renderEvents();
        startCountdown();
    }

    function deleteEvent(id) {
        if (confirm('Delete this event?')) {
            events = events.filter(function(e) { return e.id !== id; });
            if (activeEventId === id) {
                activeEventId = events.length > 0 ? events[0].id : null;
            }
            saveEvents();
            renderEvents();
            startCountdown();
        }
    }

    function addEvent() {
        var name = DOM.eventName.value.trim();
        var date = DOM.eventDate.value;

        if (!name) {
            alert('Please enter an event name.');
            return;
        }

        if (!date) {
            alert('Please select a date and time.');
            return;
        }

        var target = new Date(date);
        if (target.getTime() < Date.now()) {
            alert('The date must be in the future.');
            return;
        }

        var newEvent = {
            id: generateId(),
            name: name,
            date: date,
            createdAt: new Date().toISOString(),
            notified: false
        };

        events.push(newEvent);
        saveEvents();
        renderEvents();
        selectEvent(newEvent.id);

        DOM.eventName.value = '';
        setDefaultDate();

        // Play sound
        if (window.TimerraSounds) {
            window.TimerraSounds.playNotification();
        }
    }

    function setDefaultDate() {
        var now = new Date();
        now.setDate(now.getDate() + 7);
        var year = now.getFullYear();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var day = String(now.getDate()).padStart(2, '0');
        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        DOM.eventDate.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
    }

    function startCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        if (!activeEventId) {
            DOM.activeCountdown.innerHTML = `
                <div class="countdown-placeholder">
                    <span class="placeholder-icon">⏳</span>
                    <p class="placeholder-text">Select an event to start the countdown</p>
                </div>
            `;
            return;
        }

        var event = events.find(function(e) { return e.id === activeEventId; });
        if (!event) {
            DOM.activeCountdown.innerHTML = `
                <div class="countdown-placeholder">
                    <span class="placeholder-icon">⏳</span>
                    <p class="placeholder-text">Select an event to start the countdown</p>
                </div>
            `;
            return;
        }

        updateCountdownDisplay(event);

        countdownInterval = setInterval(function() {
            updateCountdownDisplay(event);
        }, 1000);
    }

    function updateCountdownDisplay(event) {
        var remaining = getTimeRemaining(event.date);
        var progress = getProgress(event.date);

        if (remaining.expired) {
            DOM.activeCountdown.innerHTML = `
                <div class="countdown-active">
                    <div class="countdown-name">${escapeHtml(event.name)}</div>
                    <div class="countdown-date">${formatDate(event.date)}</div>
                    <div class="countdown-expired">🎉 Event has passed!</div>
                    <div class="countdown-progress">
                        <div class="progress-fill" style="width:100%"></div>
                    </div>
                </div>
            `;
            
            // Play sound when countdown hits zero (only once)
            if (event._notified === undefined || !event._notified) {
                event._notified = true;
                if (window.TimerraSounds) {
                    window.TimerraSounds.playCountdownEnd();
                }
                if (window.TimerraNotifications) {
                    window.TimerraNotifications.send(
                        '⏳ ' + event.name,
                        '🎉 Your countdown has reached zero!'
                    );
                }
            }
            return;
        }

        DOM.activeCountdown.innerHTML = `
            <div class="countdown-active">
                <div class="countdown-name">${escapeHtml(event.name)}</div>
                <div class="countdown-date">${formatDate(event.date)}</div>
                <div class="countdown-grid">
                    <div class="countdown-item">
                        <span class="number">${String(remaining.days).padStart(2, '0')}</span>
                        <span class="label">Days</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number">${String(remaining.hours).padStart(2, '0')}</span>
                        <span class="label">Hours</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number">${String(remaining.minutes).padStart(2, '0')}</span>
                        <span class="label">Minutes</span>
                    </div>
                    <div class="countdown-item">
                        <span class="number">${String(remaining.seconds).padStart(2, '0')}</span>
                        <span class="label">Seconds</span>
                    </div>
                </div>
                <div class="countdown-progress">
                    <div class="progress-fill" style="width:${progress}%"></div>
                </div>
            </div>
        `;
    }

    function checkUpcomingNotifications() {
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
        }

        notificationCheckInterval = setInterval(function() {
            var now = Date.now();
            var oneDay = 24 * 60 * 60 * 1000;

            events.forEach(function(event) {
                var target = new Date(event.date).getTime();
                var diff = target - now;

                if (diff > 0 && diff <= oneDay && !event.notified) {
                    var days = Math.floor(diff / oneDay);
                    var hours = Math.floor((diff % oneDay) / (60 * 60 * 1000));
                    var msg = days > 0 ? days + 'd ' + hours + 'h remaining' : hours + ' hours remaining';
                    
                    if (window.TimerraNotifications) {
                        window.TimerraNotifications.send('⏳ ' + event.name, msg);
                    }
                    if (window.TimerraSounds) {
                        window.TimerraSounds.playNotification();
                    }
                    event.notified = true;
                    saveEvents();
                }
            });
        }, 60000);
    }

    function toggleTheme() {
        var html = document.documentElement;
        var current = html.getAttribute('data-bs-theme');
        var icon = DOM.themeToggle.querySelector('i');
        if (current === 'dark') {
            html.setAttribute('data-bs-theme', 'light');
            icon.className = 'bi bi-sun-fill';
        } else {
            html.setAttribute('data-bs-theme', 'dark');
            icon.className = 'bi bi-moon-fill';
        }
    }

    function getEvents() {
        return events;
    }

    function addEvents(newEvents) {
        events = events.concat(newEvents);
        saveEvents();
        renderEvents();
        if (events.length > 0 && !activeEventId) {
            selectEvent(events[0].id);
        }
    }

    function clearAll() {
        events = [];
        activeEventId = null;
        saveEvents();
        renderEvents();
        startCountdown();
    }

    // Expose for export/import
    window.TimerraEvents = {
        getEvents: getEvents,
        addEvents: addEvents,
        clearAll: clearAll
    };

    // Initialize
    function init() {
        setDefaultDate();
        loadEvents();

        DOM.addBtn.addEventListener('click', addEvent);

        DOM.eventName.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                DOM.eventDate.focus();
            }
        });

        DOM.eventDate.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                DOM.addBtn.click();
            }
        });

        DOM.themeToggle.addEventListener('click', toggleTheme);

        // Export button
        if (DOM.exportBtn) {
            DOM.exportBtn.addEventListener('click', function() {
                if (window.TimerraExport) {
                    window.TimerraExport.exportEvents(events);
                } else {
                    alert('Export module not loaded. Please refresh the page.');
                }
            });
        }

        // Import button
        if (DOM.importBtn) {
            DOM.importBtn.addEventListener('click', function() {
                if (window.TimerraExport) {
                    window.TimerraExport.importFromFile();
                } else {
                    alert('Import module not loaded. Please refresh the page.');
                }
            });
        }

        // Notify button (request permission)
        if (DOM.notifyBtn) {
            DOM.notifyBtn.addEventListener('click', function() {
                if (window.TimerraNotifications) {
                    window.TimerraNotifications.requestPermission().then(function(result) {
                        if (result === 'granted') {
                            alert('Notifications enabled! You will be notified 24 hours before your events.');
                        } else {
                            alert('Notification permission denied. Please enable in your browser settings.');
                        }
                    }).catch(function() {
                        alert('Notifications are not supported in this browser.');
                    });
                } else {
                    alert('Notifications module not loaded. Please refresh the page.');
                }
            });
        }

        // Clear all button
        if (DOM.clearAllBtn) {
            DOM.clearAllBtn.addEventListener('click', function() {
                if (window.TimerraExport) {
                    window.TimerraExport.clearAllEvents();
                } else {
                    alert('Export module not loaded. Please refresh the page.');
                }
            });
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();