const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('booksAPI', {
  isElectron: true,
  booksDir: () => ipcRenderer.invoke('books:dir'),
  load: () => ipcRenderer.invoke('books:load'),
  save: (books) => ipcRenderer.invoke('books:save', books),
  exportExcel: (bytes) => ipcRenderer.invoke('books:exportExcel', bytes),
  chooseImport: () => ipcRenderer.invoke('books:chooseImport'),
})
