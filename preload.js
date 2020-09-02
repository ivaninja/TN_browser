const { ipcRenderer } = require('electron');

window.print = () => {
  ipcRenderer.send('print', document.body.innerHTML);
};
