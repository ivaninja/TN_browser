const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const request = require('request');
const ptp  =  require("pdf-to-printer");
const os = require("os");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getPdf(url, filePath, printer) {
  const options = {silent:true, printer :printer};
  const file = await request(url);
  const ws = fs.createWriteStream(filePath);
  file.pipe(ws);
  file.on("end", function()  
  {
    ptp.print(filePath, options).then(console.log("printing done")).catch((e)=>console.log(e));    
  });
}

module.exports = function (event, url) {
    const userHomeDir = os.homedir();
    const filePath = path.join(userHomeDir, "tmp.pdf");
    console.log(filePath);
    try
    {
      getPdf(url, filePath, this.settings.ticketPrinter);    
    }
    catch(e)
    {
      console.log(e);
    }
    
};
