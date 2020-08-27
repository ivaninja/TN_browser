const electronInstaller = require('electron-winstaller');
const path = require('path');
const {version, author ,description} = require('./package');

// In this case, we can use relative paths
const settings = {
    // Specify the folder where the built app is located
    appDirectory: './build/TN_Browser-win32-x64',
    // Specify the existing folder where
    outputDirectory: './installers',
    // The name of the Author of the app (the name of your company)
    authors: author,
    description,
    // The name of the executable of your built
    exe: `./TN_Browser.exe`,
    setupIcon: './assets/favicon.ico',
    version,
    setupExe: `Setup-v${version}.exe`,
    iconUrl: path.resolve('./assets/favicon.ico'),
    noMsi: true,
    loadingGif: './assets/loading.gif'
};

(async function(){
    try {
        await electronInstaller.createWindowsInstaller(settings);
        console.log("The installers of your application were succesfully created !");
    } catch  (e) {
        console.log(`Well, sometimes you are not so lucky: ${e.message}`)
    }
}());