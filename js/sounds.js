(function() {
    var audioContext = null;

    function initAudio() {
        if (!audioContext) {
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) audioContext = new AudioCtx();
            } catch (e) {}
        }
        if (audioContext && audioContext.state === 'suspended') {
            try { audioContext.resume(); } catch (e) {}
        }
        return audioContext;
    }

    function playTone(frequency, duration, volume) {
        var ctx = initAudio();
        if (!ctx) return;

        try {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.value = volume || 0.3;
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {}
    }

    function playCountdownEnd() {
        var notes = [523.25, 659.25, 784, 1046.5];
        notes.forEach(function(freq, i) {
            setTimeout(function() {
                playTone(freq, 0.3, 0.3);
            }, i * 150);
        });
        setTimeout(function() {
            playTone(1046.5, 0.6, 0.4);
        }, notes.length * 150 + 100);
    }

    function playNotification() {
        playTone(880, 0.15, 0.2);
        setTimeout(function() {
            playTone(1108.73, 0.2, 0.2);
        }, 180);
    }

    function playTick() {
        playTone(440, 0.05, 0.1);
    }

    window.TimerraSounds = {
        playCountdownEnd: playCountdownEnd,
        playNotification: playNotification,
        playTick: playTick,
        playTone: playTone
    };
})();