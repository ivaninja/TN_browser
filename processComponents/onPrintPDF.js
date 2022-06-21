const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const request = require('request');
const ptp  =  require("pdf-to-printer");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getPdf(url, filePath, printer) {
  const options = {silent:true, printer :printer};
  const file = await request(url);
  const ws = fs.createWriteStream(filePath);
  file.pipe(ws);
  file.on("end", function()  
  {
    ptp.print(filePath, options).then(console.log("printing done"));    
  });
}

module.exports = function (event, url) {
    const filePath = path.join(__dirname, "tmp.pdf");
    getPdf(url, filePath, this.settings.ticketPrinter);    
};
