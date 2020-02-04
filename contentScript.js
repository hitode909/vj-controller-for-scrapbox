const random = (min, max) => Math.random() * (max - min) + min;

class MidiController {
    constructor() {
        this.data = new Array(64);
        this.data.fill(64);
        this.setup();
    }
    async setup() {
        const onMessage = event => {
            if (event.data[1] >= 16) event.data[1] -= 8;
            this.data[event.data[1]] = event.data[2];
        };

        const midi = await navigator.requestMIDIAccess();
        midi.inputs.forEach(input => {
            input.onmidimessage = onMessage;
        });

        const main = async () => {
            if (!navigator.requestMIDIAccess) return;
            navigator.requestMIDIAccess();
        };
        main();
    }

    get(channel, min, max) {
        return (this.data[channel]/127.0) * (max - min) + min;
    }

    getInt(channel, min, max) {
        return Math.floor((this.data[channel]/127.0) * (max - min) + min);
    }
}
const midi = new MidiController();
midi.data[15] = 64;

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
        const gain = midi.get(15,0,1) * 2;
        return sums.map(v => v * gain);
    }
};

const volume = new VolumeAverage();


const style = document.createElement('style');
document.body.appendChild(style);
style.innerHTML = `
* {
}`;

const renderers = {
    positions: [],
};

// reset
renderers.positions.push((allElements, frameCount) => {
    for (const e of allElements) {
        try {
            e.style.position = '';
            e.style.left = '';
            e.style.top = '';
            e.style.transform = '';
        } catch (ignore) { console.log(ignore) }
    }
});

// left
renderers.positions.push((allElements, frameCount) => {
    const volumes = volume.getVolumes(allElements.length, 1.0);
    let i = 0;
    for (const e of allElements) {
        try {
            e.style.position = '';
            e.style.left = '';
            e.style.top = `-${volumes[i]}px`;
            e.style.transform = '';
        } catch (ignore) { console.log(ignore) }
        i++;
    }
});

// circle
renderers.positions.push((allElements) => {
    const volumes = volume.getVolumes(allElements.length/4, 1.0);
    const SPEED = 1 / 1000;
    const RADIUS = 40;
    let i = 0;
    let r = 0;
    const t = new Date().getTime();
    for (const e of allElements) {
        try {
            r += RADIUS / allElements.length;
            e.style.position = 'absolute';
            e.style.left = `${Math.sin(t * SPEED + r) * RADIUS + 50}%`;
            e.style.top = `${Math.cos(t * SPEED + r) * RADIUS + 50}%`;
            const scale = volumes[i%volumes.length] / 100.0 + 0.05;
            e.style.transform = `scale(${scale})`;
        } catch (ignore) { console.log(ignore) }
        i++;
    }
});
// explode by volume
renderers.positions.push((allElements) => {
    const volumes = volume.getVolumes(allElements.length, 1.0);
    const SPEED = 1 / 1000;
    let i = 0;
    const t = new Date().getTime();
    for (const e of allElements) {
        i++;
        try {
            e.style.position = 'absolute';
            const volume = volumes[i] || volumes[(i + 10) % volumes.length] || volumes[(i + 10) % volumes.length];
            const radius = (volume / 100) * (volume / 100) * 100;
            e.style.left = `${Math.sin(t * SPEED + i) * radius + 50}%`;
            e.style.top = `${Math.cos(t * SPEED + i) * radius + 50}%`;
            e.style.transform = `scale(${volume / 100 + 0.1})`;
        } catch (ignore) { console.log(ignore) }
    }
});

// random
renderers.positions.push((allElements, frameCount) => {
    for (const e of allElements) {
        try {
            e.style.position = 'absolute';
            e.style.left = `${random(0, 100)}%`;
            e.style.top = `${random(0, 100)}%`;
            e.style.transform = ``;//scale(${random(0,1)})`;//  rotate(${random(0,360)}deg)`;
        } catch (ignore) { console.log(ignore) }
    }
});

let frameCount = 0;
const renderEachFrame = () => {
    requestAnimationFrame(renderEachFrame);
    const allElements = Array.from(document.querySelectorAll('.page-list-item,.page')).filter(e => e.getBoundingClientRect().width > 0);
    const visibleElements = allElements.filter(e => e.getBoundingClientRect().width > 0);
    const elements = visibleElements.length > 0 ? visibleElements : allElements;

    for (const key in renderers) {
        const fn = renderers[key];
        fn[midi.getInt(0, 0, fn.length-1)](elements, ++frameCount);
    }
};
renderEachFrame();