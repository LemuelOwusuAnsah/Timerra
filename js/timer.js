(function() {
    const DOM = {
        eventName: document.getElementById('eventName'),
        eventDate: document.getElementById('eventDate'),
        addBtn: document.getElementById('addEventBtn'),
        eventsList: document.getElementById('eventsList'),
        eventsCount: document.getElementById('eventsCount'),
        activeCountdown: document.getElementById('activeCountdown'),
        themeToggle: document.getElementById('themeToggle')
    };

    let events = [];
    let activeEventId = null;
    let countdownInterval = null;
    const STORAGE_KEY = 'timerra_events';

    function loadEvents() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                events = JSON.parse(saved);
                renderEvents();
                if (events.length > 0) {
                    selectEvent(events[0].id);
                }
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
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds, expired: false };
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
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

    function renderEvents() {
        DOM.eventsList.innerHTML = '';
        if (events.length === 0) {
            DOM.eventsList.innerHTML = '<div class="empty-events">No events yet. Create your first countdown!</div>';
            DOM.eventsCount.textContent = '0 events';
            return;
        }

        DOM.eventsCount.textContent = events.length + ' event' + (events.length > 1 ? 's' : '');

        events.forEach(function(event) {
            const item = document.createElement('div');
            item.className = 'event-item' + (event.id === activeEventId ? ' active-event' : '');

            const info = document.createElement('div');
            info.className = 'event-info';
            info.innerHTML = `
                <span class="event-name">${escapeHtml(event.name)}</span>
                <span class="event-meta">${formatDate(event.date)}</span>
            `;

            const actions = document.createElement('div');
            actions.className = 'event-actions';

            const selectBtn = document.createElement('button');
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

            const deleteBtn = document.createElement('button');
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        const name = DOM.eventName.value.trim();
        const date = DOM.eventDate.value;

        if (!name) {
            alert('Please enter an event name.');
            return;
        }

        if (!date) {
            alert('Please select a date and time.');
            return;
        }

        const target = new Date(date);
        if (target.getTime() < Date.now()) {
            alert('The date must be in the future.');
            return;
        }

        const newEvent = {
            id: generateId(),
            name: name,
            date: date
        };

        events.push(newEvent);
        saveEvents();
        renderEvents();
        selectEvent(newEvent.id);

        DOM.eventName.value = '';
        DOM.eventDate.value = '';

        // Set default date for next event
        setDefaultDate();
    }

    function setDefaultDate() {
        const now = new Date();
        now.setDate(now.getDate() + 7);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
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

        const event = events.find(function(e) { return e.id === activeEventId; });
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
        const remaining = getTimeRemaining(event.date);

        if (remaining.expired) {
            DOM.activeCountdown.innerHTML = `
                <div class="countdown-active">
                    <div class="countdown-name">${escapeHtml(event.name)}</div>
                    <div class="countdown-date">${formatDate(event.date)}</div>
                    <div class="countdown-expired">🎉 Event has passed!</div>
                </div>
            `;
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
            </div>
        `;
    }

    function toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-bs-theme');
        const icon = DOM.themeToggle.querySelector('i');
        if (current === 'dark') {
            html.setAttribute('data-bs-theme', 'light');
            icon.className = 'bi bi-sun-fill';
        } else {
            html.setAttribute('data-bs-theme', 'dark');
            icon.className = 'bi bi-moon-fill';
        }
    }

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

        // Also select event on Enter key in the event name field
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target === DOM.eventName) {
                e.preventDefault();
                DOM.eventDate.focus();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();