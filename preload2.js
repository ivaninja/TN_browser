const {ipcRenderer} = require('electron');

function loaded(node) {
    return new Promise((resolve, reject) => {
        node.onload = () => resolve(true);
    })
}

ipcRenderer.on('setContent', async (event, content) => {
    document.body.innerHTML = content;
    let images = document.querySelectorAll(`img`);

    let promises = [...images].map((img) => loaded(img));
    try {
        await Promise.all(promises);
    } catch (e) {
        console.error(`images not loaded`, e)
    }

    ipcRenderer.send('readyToPrint');
});
