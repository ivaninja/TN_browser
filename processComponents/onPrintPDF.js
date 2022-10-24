const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const request = require('request');
const ptp  =  require("pdf-to-printer");
const os = require("os");
const Url = require('url');
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
  // const userHomeDir = 'test';
    var test = Url.parse(url);
    var testarr = test.path.split('/');
    const filePath = path.join(userHomeDir, String(testarr.slice(-1)));
    try
    {
      getPdf(url, filePath, this.settings.ticketPrinter);    
    }
    catch(e)
    {
      console.log(e);
    }
    
};
