const { ipcRenderer } = require('electron');

ipcRenderer.on('setContent', (event, content) => {
  document.body.innerHTML = content;
  ipcRenderer.send('readyToPrint');
});
