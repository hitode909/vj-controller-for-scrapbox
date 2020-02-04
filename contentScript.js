const random = (min, max) => Math.random() * (max - min) + min;

class MidiController {
    constructor() {
        this.data = new Array(64);
        this.data.fill(0);
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
        return (this.data[channel] / 127.0) * (max - min) + min;
    }

    getInt(channel, min, max) {
        return Math.floor((this.data[channel] / 127.0) * (max - min) + min);
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
        const gain = midi.get(15, 0, 1) * 2;
        return sums.map(v => v * gain);
    }
};

const volume = new VolumeAverage();


const fixedStyle = document.createElement('style');
document.body.appendChild(fixedStyle);
fixedStyle.innerHTML = `
html,body {
    width: 100vw;
    height: 100vh;
}
.grid li.page-list-item {
    background: white;
    background-size: cover;
}
.grid li.page-list-item a {
  background: transparent !important;
}
`;

const renderers = {
    positions: [],
    sizes: [],
    colors: [],
    bodyTransforms: [],
};

// jump up
renderers.positions.push((allElements, frameCount) => {
    const volumes = volume.getVolumes(allElements.length, 1.0);
    const gain = midi.get(8, 0, 10);
    let i = 0;
    for (const e of allElements) {
        try {
            e.style.position = '';
            e.style.left = '';
            e.style.top = `-${volumes[i] * gain}px`;
        } catch (ignore) { console.log(ignore) }
        i++;
    }
});

// circle
renderers.positions.push((allElements) => {
    const SPEED = midi.get(8, 0.004, -0.004);
    const RADIUS = 35;
    let i = 0;
    let r = 0;
    const t = new Date().getTime();
    for (const e of allElements) {
        try {
            r += 3.14 * 2 / allElements.length;
            e.style.position = 'absolute';
            e.style.left = `${Math.sin(t * SPEED + r) * RADIUS + 45}%`;
            e.style.top = `${Math.cos(t * SPEED + r) * RADIUS + 45}%`;
        } catch (ignore) { console.log(ignore) }
        i++;
    }
});
// explode by volume
renderers.positions.push((allElements) => {
    const volumes = volume.getVolumes(allElements.length, 1.0);
    const SPEED = midi.get(8, 0.004, -0.004);
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

/// transform
renderers.sizes.push((allElements) => {
    const scale = midi.get(9, 1.0, 5.0);
    for (const e of allElements) {
        try {
            e.style.transform = `scale(${scale})`;
        } catch (ignore) { console.log(ignore) }
    }
});
renderers.sizes.push((allElements) => {
    const partNumber = midi.getInt(9, 1, allElements.length);
    const volumes = volume.getVolumes(partNumber, 1.0);
    let i = 0;
    for (const e of allElements) {
        try {
            const scale = volumes[i % volumes.length] / 100.0 + 0.05;
            e.style.transform = `scale(${scale})`;
        } catch (ignore) { console.log(ignore) }
        i++;
    }
});
renderers.sizes.push((allElements) => {
    const scale = Math.random() + 0.05;
    for (const e of allElements) {
        try {
            e.style.transform = `scale(${scale})`;
        } catch (ignore) { console.log(ignore) }
    }
});

// colors
renderers.colors.push((allElements) => {
    for (const e of allElements) {
        try {
            e.style.background = `white`;
        } catch (ignore) { console.log(ignore) }
    }
});

renderers.colors.push((() => {
    let imageElements = [];
    const reloadElements = () => { imageElements = Array.from(document.querySelectorAll('img')) };
    reloadElements();
    return (allElements, frameCount) => {
        if (frameCount % 60 === 0) reloadElements();
        const src = imageElements[midi.getInt(10, 0, imageElements.length - 1)].src;
        for (const e of allElements) {
            try {
                e.style.backgroundImage = `url('${src}')`;
                e.style.backgroundSize = 'cover';
            } catch (ignore) { console.log(ignore) }
        }
    };
})());


renderers.colors.push((allElements) => {
    let h = new Date().getTime() / 10;
    for (const e of allElements) {
        try {
            e.style.background = `hsl(${h}, 100%, 50%)`;
        } catch (ignore) { console.log(ignore) }
        h += hDiff;
    }
});

let bodyState = 0;
renderers.bodyTransforms.push((frameCount) => {
    bodyState = 0;
    document.body.style.transform = '';
    document.body.style.transformOrigin = '';
    document.body.style.transition = 'all linear 1s';
});

renderers.bodyTransforms.push((() => {
    let inner = () => {
        if (bodyState === 1) {
            document.body.style.transform = `scale3d(${Math.random() * 2 + 0.1}, ${Math.random() * 2 + 0.1}, ${Math.random() * 2 + 0.1}) rotate3d(${0}, ${0}, ${1}, ${(new Date().getTime() / 100) % 360}deg)`;
            // document.body.style.transformOrigin = `${Math.random() * 100}% ${Math.random() * 100}%`;
            document.body.style.transition = 'all linear 1s';
        }
    };
    setInterval(inner, 1000);
    return () => {
        if (bodyState !== 1) {
            bodyState = 1;
            inner();
        }
    };
})());

renderers.bodyTransforms.push((frameCount) => {
    bodyState = 2;
    document.body.style.transform = `scale(${random(-1,1)})`;
    document.body.style.transition = '';
});



let frameCount = 0;
let elements = [];
reloadElements = () => {
    const allElements = Array.from(document.querySelectorAll('.page-list-item,.page')).filter(e => e.getBoundingClientRect().width > 0);
    const visibleElements = allElements.filter(e => e.getBoundingClientRect().width > 0);
    elements = visibleElements.length > 0 ? visibleElements : allElements;
}
reloadElements();
const renderEachFrame = () => {
    frameCount++;
    requestAnimationFrame(renderEachFrame);

    if (frameCount % 60 == 0) reloadElements();

    let channel = 0;
    for (const key in renderers) {
        const fn = renderers[key];
        fn[midi.getInt(channel, 0, fn.length - 1)](elements, frameCount);
        channel++;
    }
};
renderEachFrame();