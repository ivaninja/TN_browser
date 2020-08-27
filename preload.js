const { ipcRenderer } = require('electron');

window.print = ()=>{
    ipcRenderer.send('print', 'hello main')
}