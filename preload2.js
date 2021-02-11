const {ipcRenderer} = require('electron');

function loaded(node) {
    return new Promise((resolve, reject) => {
        node.onload = () => resolve(true);
    })
}

ipcRenderer.on('setContent', async (event, content) => {
    document.body.innerHTML = content;
    let images = document.querySelectorAll(`img`);
    console.log(`images`, images)

    let promises = [...images].map((img) => loaded(img));
    try {
        let result = await Promise.all(promises);
        console.log(`images loaded: `, result);
    } catch (e) {
        console.error(`images not loaded`, e)
    }

    ipcRenderer.send('readyToPrint');
});
