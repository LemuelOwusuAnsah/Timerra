(function() {
    var deferredPrompt = null;
    var installButton = null;
    var installContainer = document.getElementById('installContainer');

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function(reg) {
                    console.log('Service Worker registered successfully');
                })
                .catch(function(err) {
                    console.log('Service Worker registration failed:', err);
                });
        } else {
            console.log('Service Worker not supported in this browser');
        }
    }

    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            showInstallButton();
        });

        window.addEventListener('appinstalled', function() {
            console.log('App installed successfully');
            if (installButton) {
                installButton.remove();
                installButton = null;
            }
        });
    }

    function showInstallButton() {
        if (!installContainer) return;
        if (installButton) return;

        installButton = document.createElement('button');
        installButton.className = 'btn-install';
        installButton.innerHTML = '<i class="bi bi-download"></i> Install App';
        installButton.addEventListener('click', function() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(choice) {
                    if (choice.outcome === 'accepted') {
                        console.log('App installed');
                    } else {
                        console.log('App installation declined');
                    }
                    deferredPrompt = null;
                    if (installButton) {
                        installButton.remove();
                        installButton = null;
                    }
                });
            } else {
                alert('Installation not available. Try opening in Chrome or Edge.');
            }
        });
        installContainer.appendChild(installButton);
    }

    function checkOffline() {
        if (!navigator.onLine) {
            showOfflineBanner();
        }

        window.addEventListener('online', function() {
            hideOfflineBanner();
        });

        window.addEventListener('offline', function() {
            showOfflineBanner();
        });
    }

    function showOfflineBanner() {
        var existing = document.querySelector('.offline-banner');
        if (existing) return;

        var banner = document.createElement('div');
        banner.className = 'offline-banner';
        banner.textContent = '⚠️ You are offline. Your events are saved locally.';
        document.body.prepend(banner);
    }

    function hideOfflineBanner() {
        var banner = document.querySelector('.offline-banner');
        if (banner) {
            banner.remove();
        }
    }

    function checkForUpdate() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(function(reg) {
                reg.update();
            });
        }
    }

    function setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            if (Notification.permission === 'granted') {
                subscribeToPush();
            }
        }
    }

    function subscribeToPush() {
        if (!('PushManager' in window)) return;

        navigator.serviceWorker.ready.then(function(reg) {
            reg.pushManager.getSubscription().then(function(sub) {
                if (sub === null) {
                    // Not subscribed - we could subscribe here
                    // For now, we just log
                    console.log('Not subscribed to push notifications');
                } else {
                    console.log('Already subscribed to push notifications');
                }
            });
        });
    }

    function initPWA() {
        registerServiceWorker();
        setupInstallPrompt();
        checkOffline();
        checkForUpdate();
        setupPushNotifications();
    }

    window.TimerraPWA = {
        registerServiceWorker: registerServiceWorker,
        setupInstallPrompt: setupInstallPrompt,
        checkOffline: checkOffline,
        checkForUpdate: checkForUpdate,
        setupPushNotifications: setupPushNotifications,
        init: initPWA
    };

    // Auto-init on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        initPWA();
    });

    // Also init if already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initPWA();
    }
})();