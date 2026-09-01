import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LIVE_NAME = 'acounting spreadshseet.xlsx'
const BOOKS_SEGMENTS = ['Documents', 'Finance', 'Soastal Books']

function normalize(p) {
  return p.replace(/\\/g, '/').toLowerCase()
}

function isLiveWorkbookPath(filePath) {
  const n = normalize(filePath)
  return n.includes(LIVE_NAME)
}

function assertWritable(filePath) {
  if (isLiveWorkbookPath(filePath)) {
    throw new Error(
      "Refused: Keith's live workbook Documents/Finance/Acounting spreadshseet.xlsx is denylisted. Soastal Books writes only an app-owned copy under Documents/Finance/Soastal Books/.",
    )
  }
}

function booksDir() {
  return path.join(os.homedir(), ...BOOKS_SEGMENTS)
}

function jsonPath() {
  return path.join(booksDir(), 'soastal-books.json')
}

function exportPath() {
  return path.join(booksDir(), 'Soastal Books Export.xlsx')
}

function ensureDir() {
  const dir = booksDir()
  assertWritable(dir)
  fs.mkdirSync(dir, { recursive: true })
  const readme = path.join(dir, 'README.txt')
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      [
        'Soastal Books — app-owned COPY folder.',
        'Never overwrite ../Acounting spreadshseet.xlsx (Keith live original).',
        'soastal-books.json is the database.',
        'Soastal Books Export.xlsx is the Excel-compatible copy for Keith.',
      ].join('\n'),
      'utf8',
    )
  }
  return dir
}

function writeFileSafe(filePath, data) {
  assertWritable(filePath)
  if (path.basename(filePath).toLowerCase() === LIVE_NAME) {
    assertWritable(filePath)
  }
  const dir = path.dirname(filePath)
  if (normalize(dir).includes('/acounting spreadshseet')) {
    throw new Error('Refused: path is inside the live workbook.')
  }
  ensureDir()
  fs.writeFileSync(filePath, data)
}

ipcMain.handle('books:dir', () => ensureDir())

ipcMain.handle('books:load', () => {
  const p = jsonPath()
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
})

ipcMain.handle('books:save', (_e, books) => {
  const p = jsonPath()
  writeFileSafe(p, JSON.stringify(books, null, 2))
  return { path: p }
})

ipcMain.handle('books:exportExcel', (_e, bytes) => {
  const p = exportPath()
  writeFileSafe(p, Buffer.from(bytes))
  return { path: p }
})

ipcMain.handle('books:chooseImport', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Import a COPY of the workbook (not Keith’s live file)',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    properties: ['openFile'],
  })
  if (res.canceled || !res.filePaths[0]) return null
  const filePath = res.filePaths[0]
  if (isLiveWorkbookPath(filePath)) {
    throw new Error('Import refused: that is Keith’s live original. Save a COPY first.')
  }
  const buf = fs.readFileSync(filePath)
  return { name: path.basename(filePath), bytes: [...buf] }
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'Soastal Books',
    backgroundColor: '#0c1f2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const devUrl = process.env.SOASTAL_DEV_URL || 'http://127.0.0.1:43173'
  if (!app.isPackaged) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  ensureDir()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
