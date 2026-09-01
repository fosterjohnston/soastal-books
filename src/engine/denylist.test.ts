import { describe, expect, it } from 'vitest'
import { assertWritablePath, isLiveWorkbookFilename, isLiveWorkbookPath, LIVE_WRITE_REFUSED } from './denylist'
import { LIVE_WORKBOOK_FILENAME, LIVE_WORKBOOK_RELATIVE } from './types'

describe('live workbook denylist', () => {
  it('blocks Keith’s misspelled live filename', () => {
    expect(isLiveWorkbookFilename('Acounting spreadshseet.xlsx')).toBe(true)
    expect(isLiveWorkbookFilename(LIVE_WORKBOOK_FILENAME)).toBe(true)
    expect(isLiveWorkbookFilename('Soastal Books Export.xlsx')).toBe(false)
  })

  it('blocks the OneDrive Documents/Finance path on Windows and POSIX', () => {
    expect(isLiveWorkbookPath(LIVE_WORKBOOK_RELATIVE)).toBe(true)
    expect(isLiveWorkbookPath('/Users/keith/Documents/Finance/Acounting spreadshseet.xlsx')).toBe(true)
    expect(isLiveWorkbookPath('C:\\Users\\Keith\\Documents\\Finance\\Acounting spreadshseet.xlsx')).toBe(true)
    expect(isLiveWorkbookPath('/Users/keith/Documents/Finance/Soastal Books/soastal-books.json')).toBe(false)
  })

  it('throws on write to the live original and allows the app copy folder', () => {
    expect(() => assertWritablePath('/onedrive/Documents/Finance/Acounting spreadshseet.xlsx')).toThrow(
      LIVE_WRITE_REFUSED,
    )
    expect(() =>
      assertWritablePath('/onedrive/Documents/Finance/Soastal Books/Soastal Books Export.xlsx'),
    ).not.toThrow()
  })
})
