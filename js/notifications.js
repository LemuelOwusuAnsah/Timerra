(function() {
    function requestPermission() {
        if ('Notification' in window) {
            return Notification.requestPermission();
        }
        return Promise.reject('Notifications not supported');
    }

    function send(title, body, icon) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                return new Notification(title, {
                    body: body,
                    icon: icon || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E⏳%3C/text%3E%3C/s