const { ipcRenderer } = require('electron');

function loaded(node) {
    return new Promise((resolve, reject) => {
        node.onload = () => resolve(true);
    });
}

ipcRenderer.on('setContent', async (event, content, printer) => {
    document.write(content);
    let images = document.querySelectorAll(`img`);

    let promises = [...images].map((img) => loaded(img));
    try {
        await Promise.all(promises);
    } catch (e) {
        console.error(`images not loaded`, e);
    }
    if(printer=="ticket")
        ipcRenderer.send('readyToPrintOther');
    else
        ipcRenderer.send('readyToPrint');
});
