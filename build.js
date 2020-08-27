const electronInstaller = require('electron-winstaller');
const path = require('path');
const {version, author} = require('./package');

// In this case, we can use relative paths
const settings = {
    // Specify the folder where the built app is located
    appDirectory: './build/TN-Browser-win32-x64',
    // Specify the existing folder where
    outputDirectory: './installers',
    // The name of the Author of the app (the name of your company)
    authors: author,
    // The name of the executable of your built
    exe: `./TN-Browser.exe`,
    setupIcon: './assets/icon.png',
    version,
    setupExe: `Setup-v${version}.exe`,
    iconUrl: path.resolve('./assets/icon.png'),
    noMsi: true
};

(async function(){
    try {
        await electronInstaller.createWindowsInstaller(settings);
        console.log("The installers of your application were succesfully created !");
    } catch  (e) {
        console.log(`Well, sometimes you are not so lucky: ${e.message}`)
    }
}());