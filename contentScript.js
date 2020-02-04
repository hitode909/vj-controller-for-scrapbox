class VolumeAverage {
    constructor() {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            this.analyser = analyser;
            this.data = new Uint8Array(analyser.frequencyBinCount);
        });
    }
    getVolumes(slice, cutoff) {
        if (!this.data)
            return 0;
        this.analyser.getByteFrequencyData(this.data);
        let sums = [];
        if (!cutoff) cutoff = 1.0;
        const cutoffLength = Math.floor(this.data.length * cutoff);
        const length = Math.floor(cutoffLength / slice);
        for (var segment = 0; segment < slice; segment++) {
            sums[segment] = 0;
            for (var i = 0; i < length; i++) {
                sums[segment] += this.data[segment * length + i];
            }
            sums[segment] /= length;
        }
        return sums;
    }
};

const volume = new VolumeAverage();

const style = document.createElement('style');
document.body.appendChild(style);
style.innerHTML = `
html, body {
  width: 100vw;
  height: 100vh;
}`;

const renderers = []
renderers.push((allElements) => {
    const volumes = volume.getVolumes(3, 1.0);
    const scale = volumes[0]/100.0;
    const SPEED = 1 / 1000;
    const RADIUS = 40;
    let i = 0;
    const t = new Date().getTime();
    for (const e of allElements) {
        try {
            if (e.getBoundingClientRect().width === 0) continue;
            i += RADIUS / allElements.length;
            e.style.position = 'absolute';
            e.style.left = `${Math.sin(t * SPEED + i) * RADIUS + 50}%`;
            e.style.top = `${Math.cos(t * SPEED + i) * RADIUS + 50}%`;
            e.style.transform = `scale(${scale})`;
        } catch (ignore) { console.log(ignore) }
    }
});
renderers.push((allElements) => {
    const volumes = volume.getVolumes(allElements.length, 1.0);
    const SPEED = 1 / 1000;
    let i = 0;
    const t = new Date().getTime();
    for (const e of allElements) {
        i++;
        try {
            if (e.getBoundingClientRect().width === 0) continue;
            e.style.position = 'absolute';
            const volume = volumes[i] || volumes[(i + 10) % volumes.length] || volumes[(i + 10) % volumes.length];
            const radius = (volume / 100) * (volume / 100) * 100;
            e.style.left = `${Math.sin(t * SPEED + i) * radius + 50}%`;
            e.style.top = `${Math.cos(t * SPEED + i) * radius + 50}%`;
            e.style.transform = `scale(${volume / 100 + 0.1})`;
        } catch (ignore) { console.log(ignore) }
    }
});

const renderEachFrame = () => {
    requestAnimationFrame(renderEachFrame);
    const allElements = Array.from(document.querySelectorAll('.page-list-item,.page')).filter(e => e.getBoundingClientRect().width > 0);
    renderers[Math.floor((new Date().getTime() / 1000)%2)](allElements);
};
renderEachFrame();



if (false) {
    setInterval(() => {
        style.innerHTML = `body {
        transform: scale3d(${Math.random() * 2 + 0.1}, ${Math.random() * 2 + 0.1}, ${Math.random() * 2 + 0.1}) rotate3d(${0}, ${0}, ${1}, ${(new Date().getTime() / 100) % 360}deg);
        transformOrigin: ${Math.random() * 100}% ${Math.random() * 100}%;
        transition: all linear 1s;
    }`;
    }, 1000);

    setInterval(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const e of allElements) {
            e.style.background = `rgb(${(Math.random() > 0.5 ? 1 : 0) * 256},${(Math.random() > 0.5 ? 1 : 0) * 256},${(Math.random() > 0.5 ? 1 : 0) * 256})`;
            e.style.color = `rgb(${(Math.random() > 0.5 ? 1 : 0) * 256},${(Math.random() > 0.5 ? 1 : 0) * 256},${(Math.random() > 0.5 ? 1 : 0) * 256})`;
        }
    }, 1000);
}